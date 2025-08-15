import os
import argparse
import json
from typing import Any, Dict, List, Sequence, Type

from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import sessionmaker

# Local imports
from config import settings
import models

# Paths / URLs
BASE_DIR = os.path.dirname(__file__)
SQLITE_PATH = os.path.join(BASE_DIR, "dashboard.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"
POSTGRES_URL = settings.DATABASE_URL or settings.db_url

# Engines and sessions
sqlite_engine = create_engine(SQLITE_URL)
pg_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
SQLiteSession = sessionmaker(bind=sqlite_engine)
PGSession = sessionmaker(bind=pg_engine)

# Tables order to respect FKs
MODEL_ORDER: List[Type] = [
    models.User,
    models.UserProfile,
    models.RegistrationCode,
    models.Employee,
    models.Project,
    models.ProjectMember,
    models.ProjectLink,
    models.Task,
    models.Transaction,
    models.Goal,
    models.ReadingItem,
    models.Note,
    models.Session,
]

SERIAL_TABLES = {
    "project_members": ("id",),
    "registration_codes": ("id",),
}


def _row_to_dict(obj) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, (dict, list)):
            data[c.name] = json.dumps(val, ensure_ascii=False)
        else:
            data[c.name] = val
    return data


def create_schema_in_postgres() -> None:
    models.Base.metadata.create_all(bind=pg_engine)


def _load_fk_sets(src_sess):
    user_ids = {row[0] for row in src_sess.query(models.User.id).all()}
    employee_ids = {row[0] for row in src_sess.query(models.Employee.id).all()}
    project_ids = {row[0] for row in src_sess.query(models.Project.id).all()}
    return user_ids, employee_ids, project_ids


def copy_table(src_sess, dst_sess, model: Type, fk_sets=None) -> int:
    rows = src_sess.query(model).all()
    if not rows:
        return 0
    table = model.__table__
    payload: List[Dict[str, Any]] = []
    skipped = 0

    user_ids = employee_ids = project_ids = set()
    if fk_sets:
        user_ids, employee_ids, project_ids = fk_sets

    for r in rows:
        d: Dict[str, Any] = {}
        for c in table.columns:
            d[c.name] = getattr(r, c.name)

        # Repair/validate foreign keys depending on table
        if table.name == "user_profiles":
            if d.get("user_id") not in user_ids:
                skipped += 1
                continue
        elif table.name == "sessions":
            if d.get("user_id") not in user_ids:
                skipped += 1
                continue
        elif table.name == "project_links":
            if d.get("project_id") not in project_ids:
                skipped += 1
                continue
        elif table.name == "project_members":
            if d.get("project_id") not in project_ids or d.get("employee_id") not in employee_ids:
                skipped += 1
                continue
        elif table.name == "tasks":
            # Optional FKs: nullify if target missing
            if d.get("assigned_to") and d.get("assigned_to") not in employee_ids:
                d["assigned_to"] = None
            if d.get("project_id") and d.get("project_id") not in project_ids:
                d["project_id"] = None
        elif table.name == "transactions":
            if d.get("employee_id") and d.get("employee_id") not in employee_ids:
                d["employee_id"] = None
            if d.get("project_id") and d.get("project_id") not in project_ids:
                d["project_id"] = None

        payload.append(d)

    if not payload:
        if skipped:
            print(f"Skipped {skipped} rows in {table.name} due to invalid FKs")
        return 0

    # Bulk insert
    # Upsert: insert rows, do nothing on conflict by primary key
    pk_cols = [c.name for c in table.primary_key.columns]
    if pk_cols:
        stmt = pg_insert(table).values(payload).on_conflict_do_nothing(index_elements=pk_cols)
        dst_sess.execute(stmt)
    else:
        dst_sess.execute(pg_insert(table).values(payload).on_conflict_do_nothing())
    dst_sess.commit()

    if skipped:
        print(f"Skipped {skipped} rows in {table.name} due to invalid FKs")

    return len(payload)


def reset_sequences(dst_sess) -> None:
    for table_name, cols in SERIAL_TABLES.items():
        for col in cols:
            seq_sql = text(
                "SELECT setval(pg_get_serial_sequence(:tname, :col), COALESCE(MAX("
                + col
                + "), 1)) FROM "
                + table_name
            )
            dst_sess.execute(seq_sql, {"tname": table_name, "col": col})
    dst_sess.commit()


def dump_inserts_sql(src_sess, outfile: str) -> None:
    with open(outfile, "w", encoding="utf-8") as f:
        f.write("BEGIN;\n\n")
        for model in MODEL_ORDER:
            table = model.__table__
            rows = src_sess.query(model).all()
            if not rows:
                continue
            cols = [c.name for c in table.columns]
            for r in rows:
                values_sql: List[str] = []
                for c in table.columns:
                    v = getattr(r, c.name)
                    if v is None:
                        values_sql.append("NULL")
                    elif isinstance(v, (int, float)):
                        values_sql.append(str(v))
                    elif isinstance(v, bool):
                        values_sql.append("TRUE" if v else "FALSE")
                    else:
                        if isinstance(v, (dict, list)):
                            v = json.dumps(v, ensure_ascii=False)
                        s = str(v)
                        s = s.replace("\\", "\\\\").replace("'", "''")
                        values_sql.append(f"'{s}'")
                f.write(
                    f"INSERT INTO {table.name} ({', '.join(cols)}) VALUES ({', '.join(values_sql)});\n"
                )
            f.write("\n")
        f.write("COMMIT;\n")


def main():
    parser = argparse.ArgumentParser(description="Migrate data from SQLite to PostgreSQL")
    parser.add_argument("--schema-only", action="store_true", help="Only create schema in PostgreSQL")
    parser.add_argument("--dump-inserts", type=str, default="", help="Path to write SQL with INSERTs from SQLite data")
    args = parser.parse_args()

    print(f"SQLite: {SQLITE_URL}")
    print(f"PostgreSQL: {POSTGRES_URL}")

    with SQLiteSession() as s_src, PGSession() as s_dst:
        # 1) Create schema in PG
        print("Creating schema in PostgreSQL...")
        create_schema_in_postgres()
        if args.schema_only:
            print("Schema created. Exiting due to --schema-only.")
            return

        # FK presence from source (SQLite may have broken FKs; we'll skip/fix)
        fk_sets = _load_fk_sets(s_src)

        # 2) Optionally dump INSERTs
        if args.dump_inserts:
            print(f"Dumping INSERT statements to {args.dump_inserts} ...")
            dump_inserts_sql(s_src, args.dump_inserts)

        # 3) Copy data in FK-safe order
        total = 0
        for model in MODEL_ORDER:
            n = copy_table(s_src, s_dst, model, fk_sets=fk_sets)
            total += n
            print(f"Copied {n:5d} rows into {model.__tablename__}")

        # 4) Reset sequences for SERIAL tables
        print("Resetting SERIAL sequences...")
        reset_sequences(s_dst)
        print(f"Done. Total rows copied: {total}")


if __name__ == "__main__":
    main() 
import os
import requests
from typing import Optional

from config import settings


API_BASE = "https://api.telegram.org/bot"


def _bot_token() -> Optional[str]:
    return settings.TELEGRAM_BOT_TOKEN


def send_message(chat_id: str, text: str) -> bool:
    """Send a simple MarkdownV2 message to a Telegram chat. Returns True on success."""
    token = _bot_token()
    if not token or not chat_id or not text:
        return False
    try:
        url = f"{API_BASE}{token}/sendMessage"
        r = requests.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }, timeout=10)
        return bool(r.ok)
    except Exception:
        return False


def set_webhook() -> bool:
    """Set webhook if TELEGRAM_WEBHOOK_URL configured. Returns True if webhook set or already configured."""
    token = _bot_token()
    webhook = settings.TELEGRAM_WEBHOOK_URL
    if not token or not webhook:
        return False
    try:
        url = f"{API_BASE}{token}/setWebhook"
        r = requests.post(url, json={
            "url": webhook,
            # pass secret token to verify updates
            "secret_token": settings.TELEGRAM_WEBHOOK_SECRET,
            "drop_pending_updates": True,
        }, timeout=10)
        return bool(r.ok)
    except Exception:
        return False


def get_webhook_info() -> Optional[dict]:
    """Fetch current webhook info from Telegram. Returns dict or None on error."""
    token = _bot_token()
    if not token:
        return None
    try:
        url = f"{API_BASE}{token}/getWebhookInfo"
        r = requests.get(url, timeout=10)
        if not r.ok:
            return None
        return r.json()
    except Exception:
        return None


def delete_webhook(drop_pending_updates: bool = True) -> bool:
    """Delete current webhook setting. Destructive: pending updates may be dropped."""
    token = _bot_token()
    if not token:
        return False
    try:
        url = f"{API_BASE}{token}/deleteWebhook"
        r = requests.post(url, json={"drop_pending_updates": bool(drop_pending_updates)}, timeout=10)
        return bool(r.ok)
    except Exception:
        return False


def get_updates(offset: Optional[int] = None, timeout: int = 25) -> list:
    """Long polling for updates. Returns a list of update dicts."""
    token = _bot_token()
    if not token:
        return []
    try:
        url = f"{API_BASE}{token}/getUpdates"
        params = {"timeout": int(timeout), "allowed_updates": ["message"]}
        if offset is not None:
            params["offset"] = int(offset)
        r = requests.get(url, json=params, timeout=timeout + 5)
        if not r.ok:
            return []
        data = r.json() or {}
        if not isinstance(data, dict) or not data.get("ok"):
            return []
        res = data.get("result") or []
        if not isinstance(res, list):
            return []
        return res
    except Exception:
        return []

def delete_message(chat_id: str, message_id: int) -> bool:
    """Attempt to delete a message from a chat. Returns True on success.
    Note: Telegram may restrict deleting user messages in private chats; failures are ignored by callers.
    """
    token = _bot_token()
    if not token or not chat_id or message_id is None:
        return False
    try:
        url = f"{API_BASE}{token}/deleteMessage"
        r = requests.post(url, json={
            "chat_id": chat_id,
            "message_id": int(message_id),
        }, timeout=10)
        return bool(r.ok)
    except Exception:
        return False

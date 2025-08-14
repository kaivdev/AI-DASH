import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/main.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=02d37f01"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("G:/DashBoard/Pyproject/frontend/src/main.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=02d37f01"; const React = __vite__cjsImport3_react.__esModule ? __vite__cjsImport3_react.default : __vite__cjsImport3_react; const useEffect = __vite__cjsImport3_react["useEffect"];
import __vite__cjsImport4_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=02d37f01"; const ReactDOM = __vite__cjsImport4_reactDom_client.__esModule ? __vite__cjsImport4_reactDom_client.default : __vite__cjsImport4_reactDom_client;
import App from "/src/App.tsx?t=1755127729405";
import "/src/index.css?t=1755127729405";
import { BrowserRouter } from "/node_modules/.vite/deps/react-router-dom.js?v=02d37f01";
import { useSettings } from "/src/stores/useSettings.ts";
function ThemeApplier({ children }) {
  _s();
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else
      root.classList.remove("dark");
  }, [theme]);
  return /* @__PURE__ */ jsxDEV(Fragment, { children }, void 0, false, {
    fileName: "G:/DashBoard/Pyproject/frontend/src/main.tsx",
    lineNumber: 34,
    columnNumber: 10
  }, this);
}
_s(ThemeApplier, "QCnCJ9TbwRTVKOlfWqLmAKz2I5w=", false, function() {
  return [useSettings];
});
_c = ThemeApplier;
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(React.StrictMode, { children: /* @__PURE__ */ jsxDEV(BrowserRouter, { children: /* @__PURE__ */ jsxDEV(ThemeApplier, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "G:/DashBoard/Pyproject/frontend/src/main.tsx",
    lineNumber: 41,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "G:/DashBoard/Pyproject/frontend/src/main.tsx",
    lineNumber: 40,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "G:/DashBoard/Pyproject/frontend/src/main.tsx",
    lineNumber: 39,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "G:/DashBoard/Pyproject/frontend/src/main.tsx",
    lineNumber: 38,
    columnNumber: 3
  }, this)
);
var _c;
$RefreshReg$(_c, "ThemeApplier");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("G:/DashBoard/Pyproject/frontend/src/main.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("G:/DashBoard/Pyproject/frontend/src/main.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBY1M7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBZFQsT0FBT0EsU0FBU0MsaUJBQWlCO0FBQ2pDLE9BQU9DLGNBQWM7QUFDckIsT0FBT0MsU0FBUztBQUNoQixPQUFPO0FBQ1AsU0FBU0MscUJBQXFCO0FBQzlCLFNBQVNDLG1CQUFtQjtBQUU1QixTQUFTQyxhQUFhLEVBQUVDLFNBQXdDLEdBQUc7QUFBQUMsS0FBQTtBQUNqRSxRQUFNQyxRQUFRSixZQUFZLENBQUNLLE1BQU1BLEVBQUVELEtBQUs7QUFDeENSLFlBQVUsTUFBTTtBQUNkLFVBQU1VLE9BQU9DLFNBQVNDO0FBQ3RCLFFBQUlKLFVBQVUsT0FBUUUsTUFBS0csVUFBVUMsSUFBSSxNQUFNO0FBQUE7QUFDMUNKLFdBQUtHLFVBQVVFLE9BQU8sTUFBTTtBQUFBLEVBQ25DLEdBQUcsQ0FBQ1AsS0FBSyxDQUFDO0FBQ1YsU0FBTyxtQ0FBR0YsWUFBSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQVk7QUFDckI7QUFBQ0MsR0FSUUYsY0FBWTtBQUFBLFVBQ0xELFdBQVc7QUFBQTtBQUFBWSxLQURsQlg7QUFVVEosU0FBU2dCLFdBQVdOLFNBQVNPLGVBQWUsTUFBTSxDQUFFLEVBQUVDO0FBQUFBLEVBQ3BELHVCQUFDLE1BQU0sWUFBTixFQUNDLGlDQUFDLGlCQUNDLGlDQUFDLGdCQUNDLGlDQUFDLFNBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFJLEtBRE47QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUVBLEtBSEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUlBLEtBTEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQU1BO0FBQ0Y7QUFBQyxJQUFBSDtBQUFBSSxhQUFBSixJQUFBIiwibmFtZXMiOlsiUmVhY3QiLCJ1c2VFZmZlY3QiLCJSZWFjdERPTSIsIkFwcCIsIkJyb3dzZXJSb3V0ZXIiLCJ1c2VTZXR0aW5ncyIsIlRoZW1lQXBwbGllciIsImNoaWxkcmVuIiwiX3MiLCJ0aGVtZSIsInMiLCJyb290IiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGFzc0xpc3QiLCJhZGQiLCJyZW1vdmUiLCJfYyIsImNyZWF0ZVJvb3QiLCJnZXRFbGVtZW50QnlJZCIsInJlbmRlciIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJtYWluLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnXHJcbmltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20vY2xpZW50J1xyXG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwJ1xyXG5pbXBvcnQgJy4vaW5kZXguY3NzJ1xyXG5pbXBvcnQgeyBCcm93c2VyUm91dGVyIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSdcclxuaW1wb3J0IHsgdXNlU2V0dGluZ3MgfSBmcm9tICcuL3N0b3Jlcy91c2VTZXR0aW5ncydcclxuXHJcbmZ1bmN0aW9uIFRoZW1lQXBwbGllcih7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9KSB7XHJcbiAgY29uc3QgdGhlbWUgPSB1c2VTZXR0aW5ncygocykgPT4gcy50aGVtZSlcclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxyXG4gICAgaWYgKHRoZW1lID09PSAnZGFyaycpIHJvb3QuY2xhc3NMaXN0LmFkZCgnZGFyaycpXHJcbiAgICBlbHNlIHJvb3QuY2xhc3NMaXN0LnJlbW92ZSgnZGFyaycpXHJcbiAgfSwgW3RoZW1lXSlcclxuICByZXR1cm4gPD57Y2hpbGRyZW59PC8+XHJcbn1cclxuXHJcblJlYWN0RE9NLmNyZWF0ZVJvb3QoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3QnKSEpLnJlbmRlcihcclxuICA8UmVhY3QuU3RyaWN0TW9kZT5cclxuICAgIDxCcm93c2VyUm91dGVyPlxyXG4gICAgICA8VGhlbWVBcHBsaWVyPlxyXG4gICAgICAgIDxBcHAgLz5cclxuICAgICAgPC9UaGVtZUFwcGxpZXI+XHJcbiAgICA8L0Jyb3dzZXJSb3V0ZXI+XHJcbiAgPC9SZWFjdC5TdHJpY3RNb2RlPlxyXG4pICJdLCJmaWxlIjoiRzovRGFzaEJvYXJkL1B5cHJvamVjdC9mcm9udGVuZC9zcmMvbWFpbi50c3gifQ==
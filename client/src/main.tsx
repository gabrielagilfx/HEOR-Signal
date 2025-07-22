import { createRoot } from "react-dom/client";
import App from "./App";
import MinimalApp from "./App-minimal";
import SafeApp from "./App-safe";
import "./index.css";

// Test different app versions to isolate the "l is not iterable" error
const params = new URLSearchParams(window.location.search);
const useMinimal = params.has('minimal');
const useSafe = params.has('safe');

let AppComponent;
if (useMinimal) {
  AppComponent = MinimalApp;
} else if (useSafe) {
  AppComponent = SafeApp;
} else {
  AppComponent = App;
}

createRoot(document.getElementById("root")!).render(<AppComponent />);

/*
	main.tsx

	React entry point. This file mounts the React application into the
	`#root` element that lives in `client/index.html`. Keep this file
	minimal: app bootstrapping and global CSS imports only.
*/
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);

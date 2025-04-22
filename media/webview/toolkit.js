import {
    provideVSCodeDesignSystem,
    allComponents
} from "@vscode/webview-ui-toolkit";

// Register the VSCode design system with all components
provideVSCodeDesignSystem().register(
    allComponents
);

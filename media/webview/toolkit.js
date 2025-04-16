import { provideVSCodeDesignSystem, vsCodeButton, vsCodePanels, vsCodePanelTab, vsCodePanelView, vsCodeTextField } from "@vscode/webview-ui-toolkit";

// Register the VS Code design system
provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeTextField(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView()
);

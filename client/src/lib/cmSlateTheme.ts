import { EditorView } from "codemirror";
import type { Extension } from "@codemirror/state";
import { syntaxHighlighting } from "@codemirror/language";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";

const slate = {
    100: "oklch(96.8% 0.007 247.896)",
    200: "oklch(92.9% 0.013 255.508)",
    700: "oklch(37.2% 0.044 257.287)",
    800: "oklch(27.9% 0.041 260.031)",
    900: "oklch(20.8% 0.042 265.755)",
};

const slateEditorTheme = EditorView.theme(
    {
        "&": {
            backgroundColor: slate[900],
        },
        ".cm-gutters": {
            backgroundColor: slate[700],
        },
        ".cm-activeLineGutter": {
            backgroundColor: slate[800],
        },
        ".cm-activeLine": {
            backgroundColor: "#47556950", // Slate 600
        },
        ".cm-selectionMatch": {
            backgroundColor: "#94a3b840", // Slate 400
        },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
            {
                backgroundColor: "#e2e8f050", // Slate 200
            },
    },
    { dark: true },
);

export const slateTheme: Extension = [
    slateEditorTheme,
    syntaxHighlighting(oneDarkHighlightStyle),
];

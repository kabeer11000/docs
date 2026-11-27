import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

/** Fenced code with syntax colours (decorations only; saved HTML stays plain `<pre><code class="language-x">`). */
export const CodeBlock = CodeBlockLowlight.configure({
  lowlight: createLowlight(common),
  defaultLanguage: null,
});

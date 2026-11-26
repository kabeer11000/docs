import type { HocuspocusProvider } from "@hocuspocus/provider";
import { debounce } from "@repo/shadcn-ui/lib/utils";
import { Collaboration } from "@tiptap/extension-collaboration";
import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Download, RotateCcw, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  PaginationPlus,
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import * as Y from "yjs";
import { editorActions, editorUIState } from "@/state/editor";
import { Button } from "../ui/button";

// Fixed pagination config to prevent memory leaks
const PAGINATION_CONFIG = {
  pageHeight: 842, // Letter height (11" × 96dpi)
  pageGap: 20,
  pageGapBorderSize: 1,
  pageBreakBackground: "var(--color-neutral-200)",
  pageHeaderHeight: 0,
  pageFooterHeight: 0,
  footerRight: "",
  footerLeft: "",
  headerRight: "",
  headerLeft: "",
  marginTop: 72, // 1" margins (1" × 72pt)
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,
  contentMarginTop: 0,
  contentMarginBottom: 0,
};
const yDoc = new Y.Doc();

const DocumentEditor = ({
  documentId,
  hocusPocusHost = "http://localhost:4321/",
}: {
  documentId: string;
  hocusPocusHost: string;
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signActive, setSignActive] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [signatures, setSignatures] = useState<
    Array<{
      id: string;
      dataUrl: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >([]);
  const [_provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Initialize provider with cleanup
  useEffect(() => {
    let hp: HocuspocusProvider | null = null;
    let mounted = true;

    const initProvider = async () => {
      try {
        const { HocuspocusProvider } = await import("@hocuspocus/provider");

        if (!mounted) return;

        hp = new HocuspocusProvider({
          url: hocusPocusHost,
          name: documentId,
          onConnect: () => {
            if (!mounted) return;
            setProvider(hp);
            editorUIState.set({ ...editorUIState.get(), isConnected: true });
            console.log("Provider connected:", hp);
          },
          onDisconnect: () => {
            if (!mounted) return;
            editorUIState.set({ ...editorUIState.get(), isConnected: false });
          },
          document: yDoc,
          onSynced: () => {
            if (!mounted) return;
            editorUIState.set({ ...editorUIState.get(), isConnected: true });
            console.log("Provider synced");
          },
        });
      } catch (error) {
        console.error("Failed to initialize provider:", error);
      }
    };

    initProvider();

    return () => {
      mounted = false;
      if (hp) {
        editorUIState.set({ ...editorUIState.get(), isConnected: false });
        hp.destroy();
        setProvider(null);
      }
    };
  }, [documentId, hocusPocusHost]);

  // Memoize editor props
  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px]",
      },
    }),
    [],
  );

  // Signature handling functions
  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setSignActive(false);
    }
  };

  const placeSignature = () => {
    if (sigCanvas.current && signActive) {
      console.log("Starting placement mode");
      setPlacementMode(true);
    }
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    if (!placementMode) return;

    e.preventDefault();
    e.stopPropagation();

    if (!sigCanvas.current) {
      console.log("No signature canvas");
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dataUrl = sigCanvas.current.toDataURL();
    const newSignature = {
      id: `signature-${Date.now()}`,
      dataUrl,
      x: Math.max(0, x - 100),
      y: Math.max(0, y - 50),
      width: 200,
      height: 100,
    };

    setSignatures((prev) => [...prev, newSignature]);
    setPlacementMode(false);
  };

  const removeSignature = (id: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
  };

  const downloadSignedDocument = () => {
    // Implementation for downloading the document with signatures
    console.log("Downloading signed document with signatures:", signatures);
  };

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      autofocus: true,
      editable: false,
      extensions: [
        StarterKit.configure({
          // @ts-expect-error
          history: false,
          heading: { levels: [1, 2] },
          undoRedo: false,
        }),
        Underline,
        TextStyle,
        FontSize,
        Color,
        ListItem,
        TablePlus,
        TableRowPlus,
        TableCellPlus,
        TableHeaderPlus,
        PaginationPlus.configure({
          ...PAGINATION_CONFIG,
          onPageCountChange: (t: number) =>
            editorUIState.set({ ...editorUIState.get(), totalPages: t }),
        }),
        Collaboration.configure({
          document: yDoc,
        }),
      ],
      onSelectionUpdate: debounce(({ editor }) => {
        const { view, state } = editor;
        const { from, to } = view.state.selection;
        const selectedText = state.doc.textBetween(from, to, "");
        if (selectedText) editorActions.setSelectedText(selectedText);
      }, 300),
      onCreate: ({ editor }) => {
        editorActions.setEditor(editor);
        console.log(
          "Editor created with extensions:",
          editor.extensionManager.extensions.map((e) => e.name),
        );
      },
      content: {},
      editorProps,
    },
    [],
  ); // Recreate editor when provider changes

  return (
    <div className="relative flex h-[calc(100vh-var(--header-height))] max-h-[calc(100vh-var(--header-height))] flex-col overflow-y-auto bg-paper-canvas">
      <div
        className="relative mx-auto my-6 w-full max-w-2xl flex-1"
        onClick={handleDocumentClick}
      >
        {/* Signature overlay for placement mode */}
        {placementMode && (
          <div className="absolute inset-0 z-10 cursor-crosshair pointer-events-none bg-primary/5 outline outline-1 outline-primary/40">
            <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 shadow-float">
              <p className="mb-2 text-[13px] font-medium">
                Click where the signature should go
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlacementMode(false);
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Placed signatures */}
        {signatures.map((signature) => (
          <div
            key={signature.id}
            className="absolute z-20 group border-2 border-transparent hover:border-primary"
            style={{
              left: signature.x,
              top: signature.y,
              width: signature.width,
              height: signature.height,
            }}
          >
            <img
              src={signature.dataUrl}
              alt="Signature"
              className="w-full h-full object-contain"
            />
            <Button
              onClick={() => removeSignature(signature.id)}
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 size-6 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove signature"
            >
              <XIcon className="size-3" />
            </Button>
          </div>
        ))}

        <EditorContent
          readOnly={true}
          editor={editor}
          className="relative w-full rounded-[2px] bg-paper text-paper-foreground shadow-paper"
          id="editor"
        />
      </div>
      <div className="sign-window sticky bottom-0 left-0 z-3 flex h-[50vh] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-popover shadow-float md:bottom-4 md:left-4 md:w-[50%] md:max-w-[40rem] md:rounded-lg">
        <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-base font-medium">Sign document</p>
            {signatures.length > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {signatures.length} placed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              disabled={!signActive}
              onClick={placeSignature}
              variant={"default"}
            >
              {placementMode ? "Placing..." : "Place"}
            </Button>
            <Button
              disabled={!signActive}
              onClick={clearSignature}
              size="icon"
              variant={"ghost"}
              title="Clear signature"
              aria-label="Clear signature"
            >
              <RotateCcw />
            </Button>
            <Button
              disabled={signatures.length === 0}
              onClick={downloadSignedDocument}
              size="icon"
              variant={"ghost"}
              title="Download signed document"
              aria-label="Download signed document"
            >
              <Download />
            </Button>
          </div>
        </div>
        <div className="relative w-full flex-1 overflow-hidden bg-muted">
          <SignatureCanvas
            onEnd={() => {
              console.log("Signature drawn");
              setSignActive(true);
            }}
            onBegin={() => {
              console.log("Started drawing signature");
            }}
            ref={sigCanvas}
            canvasProps={{
              className: "w-full h-full",
              style: { touchAction: "none" },
            }}
            backgroundColor="rgb(249, 250, 251)"
            penColor="#000000"
          />
          {!signActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-sm">Draw your signature here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;

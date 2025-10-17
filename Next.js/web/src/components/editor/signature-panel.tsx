import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { MousePointer, RotateCcw, Users } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { $auth } from "@/state/auth";
import { Button } from "../ui/button";

interface SignaturePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSignature: (dataUrl: string) => void;
  document: Document | null;
  signatureCount: number;
  isSignatureRequest?: boolean;
}

export function SignaturePanel({
  isOpen,
  onClose,
  onPlaceSignature,
  document,
  signatureCount,
  isSignatureRequest = false,
}: SignaturePanelProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signActive, setSignActive] = useState(false);
  const { user } = useStore($auth);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setSignActive(false);
    }
  };

  const placeSignature = () => {
    if (sigCanvas.current && signActive) {
      const dataUrl = sigCanvas.current.toDataURL();
      onPlaceSignature(dataUrl);
      clearSignature();
    }
  };

  const canSign =
    document &&
    user &&
    (document.owner === user.id ||
      document.sharing?.sharedWith?.some(
        (s) =>
          s.status === "active" &&
          (s.userId === user.id || s.email === user.email),
      ));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointer className="w-5 h-5" />
            {isSignatureRequest ? "Signature Required" : "Sign Document"}
          </DialogTitle>
          {isSignatureRequest && (
            <DialogDescription>
              You've been requested to sign this document. Draw your signature
              below and place it on the document. You must sign to continue.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Signature count badge */}
          {signatureCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {signatureCount} signature{signatureCount > 1 ? "s" : ""} on
                document
              </span>
            </div>
          )}

          {canSign ? (
            <>
              {/* Signature canvas */}
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 w-full h-[250px] relative overflow-hidden rounded-md">
                <SignatureCanvas
                  onEnd={() => setSignActive(true)}
                  onBegin={() => console.log("Started drawing signature")}
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
                    <p className="text-gray-500 text-sm">
                      Draw your signature here
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  disabled={!signActive}
                  onClick={clearSignature}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <div className="flex gap-2">
                  <Button onClick={onClose} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    disabled={!signActive}
                    onClick={placeSignature}
                    variant="default"
                  >
                    Place Signature
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] bg-gray-50 rounded-md">
              <Users className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">
                You don't have permission to sign this document
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Only invited collaborators can add signatures
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

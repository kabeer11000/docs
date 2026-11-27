import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { RotateCcw, Users } from "lucide-react";
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
import { sameEmail } from "@/lib/email";

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
          (s.userId === user.id || sameEmail(s.email, user.email)),
      ));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">
            {isSignatureRequest ? "Signature required" : "Sign document"}
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
            <p className="text-[13px] text-muted-foreground">
              {signatureCount} signature{signatureCount > 1 ? "s" : ""} on this
              document
            </p>
          )}

          {canSign ? (
            <>
              {/* Signature canvas */}
              <div className="relative h-[250px] w-full overflow-hidden rounded-md border border-dashed border-border bg-muted">
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
                    <p className="text-muted-foreground text-sm">
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
                >
                  <RotateCcw />
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
                    Place signature
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[250px] flex-col items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
              <Users className="mb-3 size-6 text-muted-foreground" />
              <p className="font-medium text-foreground">
                You don't have permission to sign this document
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Only invited collaborators can add signatures
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

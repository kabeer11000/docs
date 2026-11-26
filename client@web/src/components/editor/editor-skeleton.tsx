export const EditorSkeleton = () => (
  <>
    <div className="h-11 shrink-0 bg-background px-3 flex items-center">
      <div className="h-6 w-full max-w-3xl rounded-md bg-muted animate-pulse" />
    </div>
    <div className="flex-1 overflow-hidden bg-paper-canvas px-2 pt-3 md:px-8">
      <div className="mx-auto max-w-4xl min-h-[calc(100vh-10rem)] rounded-[2px] bg-paper shadow-paper p-[50px]">
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
    <div className="h-7 shrink-0 bg-background" />
  </>
);

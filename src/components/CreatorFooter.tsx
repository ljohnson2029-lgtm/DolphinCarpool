import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CreatorFooter = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-16 z-[9999] bg-muted/95 backdrop-blur-sm border-t border-border/50 py-1.5 px-4 flex items-center justify-center gap-3 text-[11px] text-muted-foreground select-none md:bottom-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
        <span>Created by Ethan Fang &amp; Luke Johnson</span>
        <button
          onClick={() => setOpen(true)}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          About Us
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About the Creators</DialogTitle>
            <DialogDescription>
              Learn more about the creators of ​Dolphin.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ​Dolphin was created by Ethan Fang and Luke Johnson to make carpooling safer and easier for ​Car Pool families. We built this platform to help parents coordinate rides, reduce traffic, and build a stronger school community.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatorFooter;

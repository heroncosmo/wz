import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageImageProps {
  src: string;
  alt?: string;
  caption?: string | null;
}

export function MessageImage({ src, alt = "Imagem", caption }: MessageImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `whatsapp-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Thumbnail */}
      <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
        <img
          src={src}
          alt={alt}
          className="max-w-[280px] max-h-[280px] rounded-lg object-cover hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        {caption && (
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{caption}</p>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-3 py-1 rounded-full text-xs">
            Clique para ampliar
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
          <div className="relative bg-black">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleDownload}
                className="bg-white/20 hover:bg-white/30 backdrop-blur"
              >
                <Download className="w-4 h-4 text-white" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur"
              >
                <X className="w-4 h-4 text-white" />
              </Button>
            </div>
            <div className="flex items-center justify-center min-h-[300px] max-h-[85vh] p-4">
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {caption && (
              <div className="bg-black/80 text-white p-4 backdrop-blur">
                <p className="text-sm whitespace-pre-wrap break-words">{caption}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

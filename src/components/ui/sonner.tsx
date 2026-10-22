import { Toaster as Sonner, toast } from "sonner";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = "light";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors={false}
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:px-5 group-[.toaster]:py-3 group-[.toaster]:min-w-0 group-[.toaster]:max-w-[420px] group-[.toaster]:gap-3",
          title: "group-[.toast]:text-[13px] group-[.toast]:font-medium group-[.toast]:tracking-normal group-[.toast]:text-foreground",
          description: "group-[.toast]:text-[12px] group-[.toast]:text-muted-foreground group-[.toast]:mt-0.5 group-[.toast]:leading-snug",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:transition-all group-[.toast]:hover:scale-105",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:text-xs group-[.toast]:transition-all group-[.toast]:hover:bg-secondary",
          closeButton: "group-[.toast]:bg-transparent group-[.toast]:border-0 group-[.toast]:text-muted-foreground group-[.toast]:transition-all hover:group-[.toast]:text-foreground",
          success: "",
          error: "",
          warning: "",
          info: "",
          loading: "",
        },
      }}
      icons={{
        success: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success flex items-center justify-center">
            <Check className="h-3 w-3 text-foreground stroke-[3]" />
          </div>
        ),
        error: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-3 w-3 text-muted-foreground stroke-[3]" />
          </div>
        ),
        warning: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-warning flex items-center justify-center">
            <AlertTriangle className="h-3 w-3 text-foreground stroke-[3]" />
          </div>
        ),
        info: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
            <Info className="h-3 w-3 text-foreground stroke-[3]" />
          </div>
        ),
        loading: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-foreground animate-spin stroke-[3]" />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

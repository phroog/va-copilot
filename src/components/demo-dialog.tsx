"use client";

import { useLocale } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoDialog({ open, onOpenChange }: DemoDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("demo.title")}</DialogTitle>
          <DialogDescription>{t("demo.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
              {t("demo.comingSoon")}
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {t("demo.videoPlaceholder")}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("demo.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

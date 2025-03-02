"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AddAppForm from "./add-app-form";
import { useTranslations } from "next-intl";

interface AddAppDialogProps {
  onSuccess?: () => void;
}

export default function AddAppDialog({ onSuccess }: AddAppDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 w-40 md:w-auto"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        {t("apps.addNew")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-h-[65vh] overflow-y-auto max-w-lg md:w-auto md:max-h-none">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{t("apps.addNew")}</DialogTitle>
          </DialogHeader>
          <AddAppForm
            onSuccess={() => {
              setOpen(false);
              onSuccess?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

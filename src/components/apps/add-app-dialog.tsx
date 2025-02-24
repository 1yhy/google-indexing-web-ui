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
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        {t("apps.addNew")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("apps.addNew")}</DialogTitle>
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

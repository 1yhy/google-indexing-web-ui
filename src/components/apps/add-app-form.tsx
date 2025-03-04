"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface AddAppFormProps {
  onSuccess?: () => void;
}

export default function AddAppForm({ onSuccess }: AddAppFormProps) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;

    try {
      const formData = new FormData(form);
      const appEmail = formData.get("appEmail") as string;
      const credentials = formData.get("credentials") as string;
      const domain = formData.get("domain") as string;

      // verify JSON format
      try {
        JSON.parse(credentials);
      } catch (error) {
        throw new Error(t("apps.invalidJsonFormat"));
      }

      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: domain,
          domain,
          appEmail,
          credentials,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("apps.addFailed"));
      }

      toast.success(t("apps.addSuccess"));

      // reset form
      form.reset();

      // call success callback
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("apps.addFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <label
            htmlFor="appEmail"
            className="text-sm md:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("apps.appEmail")}
          </label>
          <Input
            id="appEmail"
            name="appEmail"
            placeholder={t("apps.appEmailPlaceholder")}
            required
            className="text-sm md:text-base"
          />
          <p className="flex gap-1 items-center text-xs md:text-sm text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            {t("apps.appEmailHelp")}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="domain"
            className="text-sm md:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("apps.domain")}
          </label>
          <Input
            id="domain"
            name="domain"
            placeholder={t("apps.domainPlaceholder")}
            required
            className="text-sm md:text-base"
          />
          <p className="flex gap-1 items-center text-xs md:text-sm text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            {t("apps.domainHelp")}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="credentials"
            className="text-sm md:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("apps.jsonKey")}
          </label>
          <Textarea
            id="credentials"
            name="credentials"
            placeholder={t("apps.jsonKeyPlaceholder")}
            required
            className="font-mono text-xs md:text-sm min-h-[150px]"
            rows={8}
          />
          <p className="flex gap-1 items-center text-xs md:text-sm text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            {t("apps.jsonKeyHelp")}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess?.()}
          className="w-full md:w-auto text-sm md:text-base"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto text-sm md:text-base"
        >
          {loading ? t("apps.adding") : t("apps.add")}
        </Button>
      </div>
    </form>
  );
}

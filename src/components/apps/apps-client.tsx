"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import AddAppDialog from "@/components/apps/add-app-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useLocalePath } from "@/lib/utils/intl";
import { DateTimeFormatter } from "@/lib/date";

interface App {
  id: string;
  name: string;
  domain: string;
  appEmail: string;
  description: string | null;
  createdAt: Date;
}

interface AppsClientProps {
  apps: App[];
}

export default function AppsClient({ apps: initialApps }: AppsClientProps) {
  const [search, setSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const t = useTranslations();
  const getLocalePath = useLocalePath();

  const filteredApps = initialApps.filter(
    (app) =>
      app.domain.toLowerCase().includes(search.toLowerCase()) ||
      app.appEmail.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectedApps(checked ? filteredApps.map((app) => app.id) : []);
  };

  const handleSelect = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedApps([...selectedApps, id]);
    } else {
      setSelectedApps(selectedApps.filter((appId) => appId !== id));
    }
  };

  const handleDelete = async () => {
    if (selectedApps.length === 0) {
      toast.error(t("apps.selectToDelete"));
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/apps?ids=${selectedApps.join(",")}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("apps.deleteFailed"));
      }

      toast.success(t("apps.deleteSuccess"));
      setSelectedApps([]);
      router.refresh();
    } catch (error) {
      console.error("Delete apps failed :", error);
      toast.error(error instanceof Error ? error.message : t("apps.deleteFailed"));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="py-4 md:py-6">
      {/* Top navigation */}
      <div className="flex gap-4 justify-between items-start mb-6 md:flex-row md:items-center">
        <div className="flex items-center">
          <Link href={getLocalePath("/indexing")} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="ml-4 text-lg font-semibold text-gray-900 md:text-xl">{t("apps.title")}</h1>
        </div>
        <AddAppDialog onSuccess={() => router.refresh()} />
      </div>

      {/* Search and operation area */}
      <div className="flex flex-col gap-4 justify-between items-start mb-6 md:flex-row md:items-center">
        <div className="w-full md:w-64">
          <Input
            type="text"
            placeholder={t("apps.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-auto">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2 w-full md:w-auto"
            onClick={handleDelete}
            disabled={selectedApps.length === 0 || isDeleting}
          >
            {isDeleting ? t("apps.deleting") : t("apps.deleteSelected")}
          </Button>
        </div>
      </div>

      {/* App list table */}
      <div className="overflow-x-auto md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                    <Checkbox
                      id="select-all"
                      checked={selectedApps.length === filteredApps.length && filteredApps.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                    {t("apps.domain")}
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:table-cell">
                    {t("apps.appEmail")}
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:table-cell">
                    {t("apps.createdAt")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-center text-gray-500 md:px-6">
                      {search ? t("apps.noMatchingApps") : t("apps.noApps")}
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap md:px-6">
                        <Checkbox
                          checked={selectedApps.includes(app.id)}
                          onCheckedChange={(checked) => handleSelect(checked as boolean, app.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-900 whitespace-nowrap md:px-6 md:text-sm">{app.domain}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 whitespace-nowrap md:table-cell">{app.appEmail}</td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 whitespace-nowrap md:table-cell">
                        {DateTimeFormatter.format(app.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-h-[65vh] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("apps.confirmDelete")}</DialogTitle>
            <DialogDescription className="text-sm">
              {t("apps.deleteWarning", { count: selectedApps.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 md:flex-row">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full md:w-auto">
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="w-full md:w-auto">
              {isDeleting ? t("apps.deleting") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
      console.error("删除应用失败:", error);
      toast.error(error instanceof Error ? error.message : t("apps.deleteFailed"));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={getLocalePath("/indexing")} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="ml-4 text-xl font-semibold text-gray-900">{t("apps.title")}</h1>
        </div>
        <AddAppDialog onSuccess={() => router.refresh()} />
      </div>

      {/* 搜索和操作区域 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            placeholder={t("apps.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDelete}
            disabled={selectedApps.length === 0 || isDeleting}
          >
            {isDeleting ? t("apps.deleting") : t("apps.deleteSelected")}
          </Button>
        </div>
      </div>

      {/* 应用列表表格 */}
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
              >
                <Checkbox
                  id="select-all"
                  checked={selectedApps.length === filteredApps.length && filteredApps.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
              >
                {t("apps.domain")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
              >
                {t("apps.appEmail")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
              >
                {t("apps.createdAt")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm text-center text-gray-500">
                  {search ? t("apps.noMatchingApps") : t("apps.noApps")}
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={selectedApps.includes(app.id)}
                      onCheckedChange={(checked) => handleSelect(checked as boolean, app.id)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{app.domain}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{app.appEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {DateTimeFormatter.format(app.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("apps.confirmDelete")}</DialogTitle>
            <DialogDescription>{t("apps.deleteWarning", { count: selectedApps.length })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? t("apps.deleting") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

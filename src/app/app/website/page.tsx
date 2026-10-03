import { ModuleRouteGuard } from '@/components/module-route-guard';
import { WebsiteManagementPage } from '@/components/website-management-page';

export default function WebsitePage() {
  return (
    <ModuleRouteGuard module="WEBSITE">
      <WebsiteManagementPage />
    </ModuleRouteGuard>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ServiceTabItem = {
  key: string;
  label: string;
};

type ServiceTabsProps = {
  services: ServiceTabItem[];
  value: string;
  onChange: (service: string) => void;
};

const ALL_SERVICE = "all";

const toServiceKey = (service: string) => service.trim().toLowerCase();
const toServiceIdSuffix = (service: string) => toServiceKey(service).replace(/[^a-z0-9_-]/g, "-");

export const toServicePanelId = (service: string) => `service-panel-${toServiceIdSuffix(service)}`;
export const toServiceTabId = (service: string) => `service-tab-${toServiceIdSuffix(service)}`;

export default function ServiceTabs({ services, value, onChange }: ServiceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabs = useMemo(() => [{ key: ALL_SERVICE, label: "All" }, ...services], [services]);

  const queryService = searchParams.get("service")?.toLowerCase();

  useEffect(() => {
    const hasQueryService = queryService && tabs.some((tab) => tab.key === queryService);
    const nextService = hasQueryService ? queryService : ALL_SERVICE;

    if (value !== nextService) {
      onChange(nextService);
    }
  }, [onChange, queryService, tabs, value]);

  const updateQuery = (service: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (service === ALL_SERVICE) {
      params.delete("service");
    } else {
      params.set("service", service);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const handleClick = (service: string) => {
    onChange(service);
    updateQuery(service);
  };

  return (
    <div className="mb-4 border-b border-gray-200">
      <div role="tablist" aria-label="Service tabs" className="flex gap-1 overflow-x-auto">
        {tabs.map((service) => {
          const selected = value === service.key;

          return (
            <button
              key={service.key}
              id={toServiceTabId(service.key)}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                "whitespace-nowrap px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1",
                selected
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              ].join(" ")}
              onClick={() => handleClick(service.key)}
            >
              {service.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { ALL_SERVICE, toServiceKey };

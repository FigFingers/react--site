"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ServiceTabsProps = {
  services: string[];
  onServiceChange: (service: string) => void;
};

const ALL_SERVICE = "all";

const toServiceKey = (service: string) => service.trim().toLowerCase();
const toServiceIdSuffix = (service: string) => toServiceKey(service).replace(/[^a-z0-9_-]/g, "-");

export const toServicePanelId = (service: string) => `service-panel-${toServiceIdSuffix(service)}`;
export const toServiceTabId = (service: string) => `service-tab-${toServiceIdSuffix(service)}`;

export default function ServiceTabs({ services, onServiceChange }: ServiceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabs = useMemo(() => [ALL_SERVICE, ...services], [services]);

  const queryService = searchParams.get("service")?.toLowerCase();
  const initialService = queryService && tabs.includes(queryService) ? queryService : ALL_SERVICE;

  const [focusedIndex, setFocusedIndex] = useState(() => tabs.indexOf(initialService));
  const [selectedService, setSelectedService] = useState(initialService);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const nextService = queryService && tabs.includes(queryService) ? queryService : ALL_SERVICE;

    setSelectedService(nextService);
    setFocusedIndex(tabs.indexOf(nextService));
    onServiceChange(nextService);
  }, [onServiceChange, queryService, tabs]);

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

  const selectByIndex = (index: number) => {
    const service = tabs[index];
    setSelectedService(service);
    setFocusedIndex(index);
    onServiceChange(service);
    updateQuery(service);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      setFocusedIndex(nextIndex);
      tabRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectByIndex(index);
    }
  };

  return (
    <div role="tablist" aria-label="Service tabs" className="flex gap-2 mb-4">
      {tabs.map((service, index) => {
        const tabId = toServiceTabId(service);
        const panelId = toServicePanelId(service);
        const selected = selectedService === service;

        return (
          <button
            key={service}
            id={tabId}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={focusedIndex === index ? 0 : -1}
            onClick={() => selectByIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`px-3 py-1 rounded border ${
              selected ? "bg-gray-700 text-white" : "bg-white text-gray-700"
            }`}
          >
            {service === ALL_SERVICE ? "All" : service}
          </button>
        );
      })}
    </div>
  );
}

export { ALL_SERVICE, toServiceKey };

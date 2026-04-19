import type { ReactNode } from "react";
import { AdminApiToolPanelsCore } from "./admin-api-tool-panels-core";
import { AdminApiToolPanelsExtended } from "./admin-api-tool-panels-extended";
import type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";

export type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";

export function AdminApiToolPanels(props: AdminApiToolPanelsProps): ReactNode {
	switch (props.tab.apiToolId) {
		case "service":
		case "cache-admin":
		case "state-filesystem":
			return <AdminApiToolPanelsCore {...props} />;
		case "artifacts-workflows":
		case "kv-store":
		case "search-tools":
		case "metrics":
			return <AdminApiToolPanelsExtended {...props} />;
		default:
			return null;
	}
}

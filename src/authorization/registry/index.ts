// src/authorization/registry/index.ts

import { PermissionGraph } from "./PermissionGraph";
import { ALL_PERMISSIONS } from "./modules";

export const permissionGraph =
    new PermissionGraph(ALL_PERMISSIONS);
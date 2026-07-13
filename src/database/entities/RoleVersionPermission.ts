import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { RoleVersion } from './RoleVersion';

@Entity('role_version_permissions')
@Unique(['roleVersionId', 'permissionKey'])
@Index(['roleVersionId'])
export class RoleVersionPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_version_id', type: 'uuid' })
  roleVersionId: string;

  @ManyToOne(() => RoleVersion, (rv) => rv.roleVersionPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_version_id' })
  roleVersion: RoleVersion;

  @Column({ name: 'permission_key', type: 'varchar', length: 100 })
  permissionKey: string;

  @Column({ name: 'permission_name', type: 'varchar', length: 100 })
  permissionName: string;

  @Column({ name: 'module_slug', type: 'varchar', length: 100 })
  moduleSlug: string;

  @Column({ name: 'module_name', type: 'varchar', length: 100 })
  moduleName: string;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';
import { OrganizationEntity } from './organization.entity';
import { RoleEntity } from './role.entity';

@Entity('user_organizations')
@Index(['userId', 'organizationId'], { unique: true })
export class UserOrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;
  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'organization_id' })
  organizationId: string;
  @ManyToOne(() => OrganizationEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({ name: 'role_id' })
  roleId: string;
  @ManyToOne(() => RoleEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role?: RoleEntity;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'invited_pending', default: false })
  invitedPending: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

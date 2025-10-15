import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('audit_logs')
@Index(['userId'])
@Index(['organizationId'])
@Index(['resource'])
@Index(['timestamp'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'json', nullable: true })
  details?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('tasks')
@Index(['organizationId', 'isArchived']) // For efficient querying
@Index(['assigneeId'])
@Index(['createdById'])
@Index(['status'])
@Index(['priority'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  status: string;

  @Column()
  priority: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId?: string;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: UserEntity;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: UserEntity;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { eager: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @Column({ name: 'due_date', nullable: true })
  dueDate?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'order', default: 0 })
  order: number;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
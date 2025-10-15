import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  resource: string;

  @Column()
  action: string;

  @Column({ type: 'json', nullable: true })
  conditions?: Record<string, any>;

  @ManyToMany(() => require('./role.entity').RoleEntity, (role: any) => role.permissions)
  roles?: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
import { Prop } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export abstract class BaseEntitySchema {
  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  updatedBy?: Types.ObjectId;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}


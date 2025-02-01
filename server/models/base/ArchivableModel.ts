/* eslint-disable @typescript-eslint/ban-types */
import { AllowNull, Column, IsDate } from "sequelize-typescript";
import ParanoidModel from "./ParanoidModel";

class ArchivableModel<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = TModelAttributes
> extends ParanoidModel<TModelAttributes, TCreationAttributes> {
  /** Whether the model is archived, and if so when. */
  @AllowNull
  @IsDate
  @Column
  archivedAt: Date | null;

  /**
   * Whether the model has been archived.
   *
   * @returns True if the model has been archived
   */
  get isArchived() {
    return !!this.archivedAt;
  }
}

export default ArchivableModel;

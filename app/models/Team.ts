import { computed, observable } from "mobx";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference, TeamPreferences, UserRole } from "@shared/types";
import { stringToColor } from "@shared/utils/color";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Team extends Model {
  static modelName = "Team";

  @Field
  @observable
  name: string;

  @Field
  @observable
  avatarUrl: string;

  @Field
  @observable
  sharing: boolean;

  @Field
  @observable
  inviteRequired: boolean;

  @Field
  @observable
  commenting: boolean;

  @Field
  @observable
  documentEmbeds: boolean;

  @Field
  @observable
  defaultCollectionId: string | null;

  @Field
  @observable
  memberCollectionCreate: boolean;

  @Field
  @observable
  memberTeamCreate: boolean;

  @Field
  @observable
  guestSignin: boolean;

  @Field
  @observable
  subdomain: string | null | undefined;

  @Field
  @observable
  previousSubdomains: string[] | null | undefined;
  
  @Field
  @observable
  defaultUserRole: UserRole;

  @Field
  @observable
  preferences: TeamPreferences | null;

  @observable
  domain: string | null | undefined;

  @observable
  url: string;

  @Field
  @observable
  allowedDomains: string[] | null | undefined;

  @computed
  get signinMethods(): string {
    return "SSO";
  }

  @computed
  get color(): string {
    return stringToColor(this.id);
  }

  @computed
  get initial(): string {
    return (this.name ? this.name[0] : "?").toUpperCase();
  }

  /**
   * Returns the value of the provided preference.
   *
   * @param preference The team preference to retrieve
   * @returns The preference value if set, else the default value
   */
  getPreference<T extends keyof TeamPreferences>(
    key: T,
    defaultValue?: TeamPreferences[T]
  ): TeamPreferences[T] | false {
    return (
      this.preferences?.[key] ??
      TeamPreferenceDefaults[key] ??
      defaultValue ??
      false
    );
  }

  /**
   * Set the value for a specific preference key.
   *
   * @param key The TeamPreference key to retrieve
   * @param value The value to set
   */
  setPreference(key: TeamPreference, value: boolean) {
    this.preferences = {
      ...this.preferences,
      [key]: value,
    };
  }

  set subdomain(newSubdomain: string | null | undefined) {
    if (this.subdomain && this.subdomain !== newSubdomain) {
      this.previousSubdomains = this.previousSubdomains || [];
      // Ensure the array length is capped at 5
      if (this.previousSubdomains.length >= 5) {
        this.previousSubdomains.shift();
      }
      this.previousSubdomains.push(this.subdomain);
    }

    this.subdomain = newSubdomain;
  }
}

export default Team;

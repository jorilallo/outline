import { OpenIcon } from "outline-icons";
import * as React from "react";
import { DefaultTheme, ThemeProps } from "styled-components";
import { EmbedProps as Props } from "../embeds";
import Widget from "./Widget";

export default function DisabledEmbed(
  props: Omit<Props, "attrs"> & {
    attrs: { href: string };
  } & ThemeProps<DefaultTheme>
) {
  return (
    <Widget
      title={props.embed.name}
      href={props.attrs.href}
      icon={props.embed.icon}
      context={props.attrs.href.replace(/^https?:\/\//, "")}
      isSelected={props.isSelected}
      theme={props.theme}
    >
      <OpenIcon size={20} />
    </Widget>
  );
}

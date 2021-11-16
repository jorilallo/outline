import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import HelpText from "components/HelpText";
import useWindowScrollPosition from "hooks/useWindowScrollPosition";

const HEADING_OFFSET = 20;
type Props = {
  headings: {
    title: string;
    level: number;
    id: string;
  }[];
};

export default function Contents({ headings }: Props) {
  const [activeSlug, setActiveSlug] = React.useState();
  const position = useWindowScrollPosition({
    throttle: 100,
  });
  React.useEffect(() => {
    for (let key = 0; key < headings.length; key++) {
      const heading = headings[key];
      const element = window.document.getElementById(
        decodeURIComponent(heading.id)
      );

      if (element) {
        const bounding = element.getBoundingClientRect();

        if (bounding.top > HEADING_OFFSET) {
          const last = headings[Math.max(0, key - 1)];
          // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
          setActiveSlug(last.id);
          return;
        }
      }
    }
  }, [position, headings]);
  // calculate the minimum heading level and adjust all the headings to make
  // that the top-most. This prevents the contents from being weirdly indented
  // if all of the headings in the document are level 3, for example.
  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );
  const headingAdjustment = minHeading - 1;
  return (
    <div>
      <Wrapper>
        <Heading>Contents</Heading>
        {headings.length ? (
          <List>
            {headings.map((heading) => (
              <ListItem
                key={heading.id}
                // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                level={heading.level - headingAdjustment}
                active={activeSlug === heading.id}
              >
                <Link href={`#${heading.id}`}>{heading.title}</Link>
              </ListItem>
            ))}
          </List>
        ) : (
          <Empty>Headings you add to the document will appear here</Empty>
        )}
      </Wrapper>
    </div>
  );
}
const Wrapper = styled("div")`
  display: none;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 80px);

  box-shadow: 1px 0 0 ${(props) => props.theme.divider};
  margin-top: 40px;
  margin-right: 3.2em;
  min-height: 40px;
  overflow-y: auto;

  ${breakpoint("desktopLarge")`
    margin-left: -16em;
  `};

  ${breakpoint("tablet")`
    display: block;
  `};
`;
const Heading = styled("h3")`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props) => props.theme.sidebarText};
  letter-spacing: 0.04em;
`;
const Empty = styled(HelpText)`
  margin: 1em 0 4em;
  padding-right: 2em;
  min-width: 16em;
  width: 16em;
  font-size: 14px;
`;
const ListItem = styled("li")`
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'level' does not exist on type 'ThemedSty... Remove this comment to see the full error message
  margin-left: ${(props) => (props.level - 1) * 10}px;
  margin-bottom: 8px;
  padding-right: 2em;
  line-height: 1.3;
  border-right: 3px solid
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'active' does not exist on type 'ThemedSt... Remove this comment to see the full error message
    ${(props) => (props.active ? props.theme.divider : "transparent")};

  a {
    color: ${(props) =>
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'active' does not exist on type 'ThemedSt... Remove this comment to see the full error message
      props.active ? props.theme.primary : props.theme.text};
  }
`;
const Link = styled("a")`
  color: ${(props) => props.theme.text};
  font-size: 14px;

  &:hover {
    color: ${(props) => props.theme.primary};
  }
`;
const List = styled("ol")`
  min-width: 14em;
  width: 14em;
  padding: 0;
  list-style: none;
`;

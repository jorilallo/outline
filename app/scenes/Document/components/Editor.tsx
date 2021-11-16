import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { TFunction, withTranslation } from "react-i18next";

import PoliciesStore from "stores/PoliciesStore";
import Document from "models/Document";
import ClickablePadding from "components/ClickablePadding";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor, { Props as EditorProps } from "components/Editor";

import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import EditableTitle from "./EditableTitle";
import MultiplayerEditor from "./MultiplayerEditor";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = EditorProps & {
  onChangeTitle: (text: string) => void;
  title: string;
  document: Document;
  isDraft: boolean;
  shareId: string | null | undefined;
  multiplayer?: boolean;
  onSave: (arg0: {
    done?: boolean;
    autosave?: boolean;
    publish?: boolean;
  }) => any;
  innerRef: {
    current: any;
  };
  children: React.ReactNode;
  policies: PoliciesStore;
  t: TFunction;
};

@observer
class DocumentEditor extends React.Component<Props> {
  @observable
  activeLinkEvent: MouseEvent | null | undefined;

  ref = React.createRef<HTMLDivElement | HTMLInputElement>();

  focusAtStart = () => {
    if (this.props.innerRef.current) {
      this.props.innerRef.current.focusAtStart();
    }
  };

  focusAtEnd = () => {
    if (this.props.innerRef.current) {
      this.props.innerRef.current.focusAtEnd();
    }
  };

  insertParagraph = () => {
    if (this.props.innerRef.current) {
      const { view } = this.props.innerRef.current;
      const { dispatch, state } = view;
      dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
    }
  };

  handleLinkActive = (event: MouseEvent) => {
    this.activeLinkEvent = event;
  };

  handleLinkInactive = () => {
    this.activeLinkEvent = null;
  };

  handleGoToNextInput = (insertParagraph: boolean) => {
    if (insertParagraph) {
      this.insertParagraph();
    }

    this.focusAtStart();
  };

  render() {
    const {
      document,
      title,
      onChangeTitle,
      isDraft,
      shareId,
      readOnly,
      innerRef,
      children,
      policies,
      multiplayer,
      t,
      ...rest
    } = this.props;
    const EditorComponent = multiplayer ? MultiplayerEditor : Editor;
    return (
      <Flex auto column>
        <EditableTitle
          value={title}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | undefined' is not assignable to ty... Remove this comment to see the full error message
          readOnly={readOnly}
          document={document}
          onGoToNextInput={this.handleGoToNextInput}
          onChange={onChangeTitle}
        />
        {!shareId && (
          <DocumentMetaWithViews
            isDraft={isDraft}
            document={document}
            to={documentHistoryUrl(document)}
            rtl={
              this.ref.current
                ? window.getComputedStyle(this.ref.current).direction === "rtl"
                : false
            }
          />
        )}
        <EditorComponent
          ref={innerRef}
          autoFocus={!!title && !this.props.defaultValue}
          placeholder={t("…the rest is up to you")}
          onHoverLink={this.handleLinkActive}
          scrollTo={window.location.hash}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ id?: string | undefined; value?: string | ... Remove this comment to see the full error message
          readOnly={readOnly}
          shareId={shareId}
          grow
          {...rest}
        />
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this
        call.
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
        {this.activeLinkEvent && !shareId && readOnly && (
          <HoverPreview
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'EventTarget | null' is not assignable to typ... Remove this comment to see the full error message
            node={this.activeLinkEvent.target}
            event={this.activeLinkEvent}
            onClose={this.handleLinkInactive}
          />
        )}
        {children}
      </Flex>
    );
  }
}

// @ts-expect-error ts-migrate(2344) FIXME: Type 'DocumentEditor' does not satisfy the constra... Remove this comment to see the full error message
export default withTranslation()<DocumentEditor>(
  inject("policies")(DocumentEditor)
);

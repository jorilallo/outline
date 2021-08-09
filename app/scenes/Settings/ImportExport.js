// @flow
import invariant from "invariant";
import { observer } from "mobx-react";
import { CollectionIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link, useLocation, useHistory } from "react-router-dom";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import { parseOutlineExport } from "shared/utils/zip";
import { PAGINATION_SYMBOL } from "stores/BaseStore";
import Avatar from "components/Avatar";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Notice from "components/Notice";
import Scene from "components/Scene";
import { type Props as TableProps } from "components/Table";
import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import useMobile from "hooks/useMobile";
import useQuery from "hooks/useQuery";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import getDataTransferFiles from "utils/getDataTransferFiles";
import { uploadFile } from "utils/uploadFile";

const Table = React.lazy<TableProps>(() =>
  import(/* webpackChunkName: "table" */ "components/Table")
);

function ImportExport() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const fileRef = React.useRef();
  const params = useQuery();
  const { exports, collections } = useStores();
  const { showToast } = useToasts();
  const [data, setData] = useState([]);
  const [isLoading, setLoading] = React.useState(false);
  const [isExportDataLoading, setExportDataLoading] = React.useState(false);
  const [isImporting, setImporting] = React.useState(false);
  const [isImported, setImported] = React.useState(false);
  const [isExporting, setExporting] = React.useState(false);
  const [file, setFile] = React.useState();
  const [importDetails, setImportDetails] = React.useState();
  const limit = 15;
  const key = params.get("key") || "";
  const page = parseInt(params.get("page") || 0, 10);
  const sort = params.get("sort") || "createdAt";
  const direction = (params.get("direction") || "desc").toUpperCase();
  const [totalPages, setTotalPages] = React.useState(0);
  const isMobile = useMobile();
  const location = useLocation();
  const history = useHistory();
  const topRef = React.useRef();

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        Header: t("Name"),
        accessor: "user",
        disableSortBy: true,
        Cell: observer(({ value, row }) => {
          return (
            <Flex align="center" gap={8}>
              {!isMobile && (
                <Avatar src={row.original.user.avatarUrl} size={32} />
              )}
              {value.name} {user.id === row.original.user.id && `(${t("You")})`}
            </Flex>
          );
        }),
      },
      {
        id: "collection",
        Header: t("Collection"),
        accessor: "collection",
        disableSortBy: true,
        Cell: observer(({ value }) => {
          if (!value) return "All collections";
          return <Link to={value.url}>{value.name}</Link>;
        }),
      },
      {
        id: "state",
        Header: t("State"),
        accessor: "state",
        disableSortBy: true,
        Cell: observer(({ value }) => value),
      },
      {
        id: "url",
        Header: t("Url"),
        accessor: "url",
        disableSortBy: true,
        Cell: observer(({ value }) => {
          if (!value) return value;
          return (
            <a href={value} rel="noreferrer" target="_blank">
              Link
            </a>
          );
        }),
      },
      {
        id: "size",
        Header: t("Size"),
        accessor: "size",
        sortType: "number",
        Cell: observer(
          ({ value }) => (value / (1024 * 1024)).toPrecision(2) + "MB"
        ),
      },
      {
        id: "createdAt",
        Header: t("Created"),
        accessor: "createdAt",
        Cell: observer(
          ({ value }) => value && <Time dateTime={value} addSuffix />
        ),
      },
    ],
    [t, isMobile, user.id]
  );

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setExportDataLoading(true);
        const response = await exports.fetchPage({
          offset: page * limit,
          limit,
          direction,
          sort,
        });
        setData(response.slice(0, limit));
        setTotalPages(Math.ceil(response[PAGINATION_SYMBOL].total / limit));
      } catch (err) {
        showToast(err.message);
      } finally {
        setExportDataLoading(false);
      }
    };

    fetchData();
  }, [direction, exports, page, showToast, sort, exports.orderedData]);

  const handleChangePage = React.useCallback(
    (page) => {
      if (page) {
        params.set("page", page.toString());
      } else {
        params.delete("page");
      }
      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });

      if (topRef.current) {
        scrollIntoView(topRef.current, {
          scrollMode: "if-needed",
          behavior: "instant",
          block: "start",
        });
      }
    },
    [params, history, location.pathname]
  );

  const handleChangeSort = React.useCallback(
    (sort, direction) => {
      if (sort) {
        params.set("sort", sort);
      } else {
        params.delete("sort");
      }
      if (direction === "ASC") {
        params.set("direction", direction.toLowerCase());
      } else {
        params.delete("direction");
      }
      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleImport = React.useCallback(
    async (ev) => {
      setImported(undefined);
      setImporting(true);

      try {
        invariant(file, "File must exist to upload");
        const attachment = await uploadFile(file, {
          name: file.name,
        });
        await collections.import(attachment.id);
        showToast(t("Import started"));
        setImported(true);
      } catch (err) {
        showToast(err.message);
      } finally {
        if (fileRef.current) {
          fileRef.current.value = "";
        }
        setImporting(false);
        setFile(undefined);
        setImportDetails(undefined);
      }
    },
    [t, file, collections, showToast]
  );

  const handleFilePicked = React.useCallback(async (ev) => {
    ev.preventDefault();

    const files = getDataTransferFiles(ev);
    const file = files[0];
    setFile(file);

    try {
      setImportDetails(await parseOutlineExport(file));
    } catch (err) {
      setImportDetails([]);
    }
  }, []);

  const handlePickFile = React.useCallback(
    (ev) => {
      ev.preventDefault();

      if (fileRef.current) {
        fileRef.current.click();
      }
    },
    [fileRef]
  );

  const handleExport = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      setLoading(true);

      try {
        await collections.export();
        setExporting(true);
        showToast(t("Export in progress…"));
      } finally {
        setLoading(false);
      }
    },
    [t, collections, showToast]
  );

  const hasCollections = importDetails
    ? !!importDetails.filter((detail) => detail.type === "collection").length
    : false;
  const hasDocuments = importDetails
    ? !!importDetails.filter((detail) => detail.type === "document").length
    : false;
  const isImportable = hasCollections && hasDocuments;

  return (
    <Scene
      title={`${t("Import")} / ${t("Export")}`}
      icon={<DocumentIcon color="currentColor" />}
    >
      <Heading>{t("Import")}</Heading>
      <HelpText>
        <Trans>
          It is possible to import a zip file of folders and Markdown files
          previously exported from an Outline instance. Support will soon be
          added for importing from other services.
        </Trans>
      </HelpText>
      <VisuallyHidden>
        <input
          type="file"
          ref={fileRef}
          onChange={handleFilePicked}
          accept="application/zip"
        />
      </VisuallyHidden>
      {isImported && (
        <Notice>
          <Trans>
            Your file has been uploaded and the import is currently being
            processed, you can safely leave this page while it completes.
          </Trans>
        </Notice>
      )}
      {file && !isImportable && (
        <ImportPreview>
          <Trans
            defaults="Sorry, the file <em>{{ fileName }}</em> is missing valid collections or documents."
            values={{ fileName: file.name }}
            components={{ em: <strong /> }}
          />
        </ImportPreview>
      )}
      {file && importDetails && isImportable ? (
        <>
          <ImportPreview as="div">
            <Trans
              defaults="<em>{{ fileName }}</em> looks good, the following collections and their documents will be imported:"
              values={{ fileName: file.name }}
              components={{ em: <strong /> }}
            />
            <List>
              {importDetails
                .filter((detail) => detail.type === "collection")
                .map((detail) => (
                  <ImportPreviewItem key={detail.path}>
                    <CollectionIcon />
                    <CollectionName>{detail.name}</CollectionName>
                  </ImportPreviewItem>
                ))}
            </List>
          </ImportPreview>
          <Button
            type="submit"
            onClick={handleImport}
            disabled={isImporting}
            primary
          >
            {isImporting ? `${t("Uploading")}…` : t("Confirm & Import")}
          </Button>
        </>
      ) : (
        <Button type="submit" onClick={handlePickFile} primary>
          {t("Choose File")}…
        </Button>
      )}

      <Heading>{t("Export")}</Heading>
      <HelpText>
        <Trans
          defaults="A full export might take some time, consider exporting a single document or collection if possible. We’ll put together a zip of all your documents in Markdown format and email it to <em>{{ userEmail }}</em>."
          values={{ userEmail: user.email }}
          components={{ em: <strong /> }}
        />
      </HelpText>
      <Button
        type="submit"
        onClick={handleExport}
        disabled={isLoading || isExporting}
        primary
      >
        {isExporting
          ? t("Export Requested")
          : isLoading
          ? `${t("Requesting Export")}…`
          : t("Export Data")}
      </Button>
      <Heading>
        <Trans>Exports</Trans>
      </Heading>
      <Table
        columns={columns}
        data={data}
        isLoading={isExportDataLoading}
        onChangePage={handleChangePage}
        onChangeSort={handleChangeSort}
        page={page}
        totalPages={totalPages}
        defaultSortDirection="DESC"
        defaultSort="createdAt"
        id={key}
      />
    </Scene>
  );
}

const List = styled.ul`
  padding: 0;
  margin: 8px 0 0;
`;

const ImportPreview = styled(Notice)`
  margin-bottom: 16px;
`;

const ImportPreviewItem = styled.li`
  display: flex;
  align-items: center;
  list-style: none;
`;

const CollectionName = styled.span`
  font-weight: 500;
  margin-left: 4px;
`;

export default observer(ImportExport);

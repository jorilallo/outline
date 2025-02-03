import { observer } from "mobx-react";
import * as React from "react";
import { Switch, Redirect, RouteComponentProps } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Route from "~/components/ProfiledRoute";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import lazy from "~/utils/lazyWithRetry";
import {
  archivePath,
  draftsPath,
  homePath,
  searchPath,
  settingsPath,
  matchDocumentSlug as slug,
  trashPath,
} from "~/utils/routeHelpers";

const SettingsRoutes = lazy(() => import("./settings"));
const Archive = lazy(() => import("~/scenes/Archive"));
const Collection = lazy(() => import("~/scenes/Collection"));
const Document = lazy(() => import("~/scenes/Document"));
const Drafts = lazy(() => import("~/scenes/Drafts"));
const Home = lazy(() => import("~/scenes/Home"));
const Search = lazy(() => import("~/scenes/Search"));
const Trash = lazy(() => import("~/scenes/Trash"));

const RedirectDocument = ({
  match,
}: RouteComponentProps<{ documentSlug: string }>) => (
  <Redirect
    to={
      match.params.documentSlug
        ? `/doc/${match.params.documentSlug}`
        : homePath()
    }
  />
);

function AuthenticatedRoutes() {
  const team = useCurrentTeam();
  const can = usePolicy(team);

  return (
    <WebsocketProvider>
      <AuthenticatedLayout>
        <React.Suspense
          fallback={
            <CenteredContent>
              <PlaceholderDocument />
            </CenteredContent>
          }
        >
          <Switch>
            {can.createDocument && (
              <Route exact path={draftsPath()} component={Drafts} />
            )}
            {can.createDocument && (
              <Route exact path={archivePath()} component={Archive} />
            )}
            {can.createDocument && (
              <Route exact path={trashPath()} component={Trash} />
            )}
            <Route path={`${homePath()}/:tab?`} component={Home} />
            <Redirect from="/dashboard" to={homePath()} />
            <Redirect exact from="/starred" to={homePath()} />
            <Redirect exact from="/templates" to={settingsPath("templates")} />
            <Redirect exact from="/collections/*" to="/collection/*" />
            <Route exact path="/collection/:id/new" component={DocumentNew} />
            <Route exact path="/collection/:id/:tab?" component={Collection} />
            <Route exact path="/doc/new" component={DocumentNew} />
            <Route exact path={`/d/${slug}`} component={RedirectDocument} />
            <Route
              exact
              path={`/doc/${slug}/history/:revisionId?`}
              component={Document}
            />
            <Route exact path={`/doc/${slug}/insights`} component={Document} />
            <Route exact path={`/doc/${slug}/edit`} component={Document} />
            <Route path={`/doc/${slug}`} component={Document} />
            <Route exact path={`${searchPath()}/:term?`} component={Search} />
            <Route path="/404" component={Error404} />
            <SettingsRoutes />
            <Route component={Error404} />
          </Switch>
        </React.Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}

export default observer(AuthenticatedRoutes);

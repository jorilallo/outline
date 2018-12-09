// @flow
import * as React from 'react';

const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)&?/i;

type Props = {
  url: string,
};

export default class YouTube extends React.Component<Props> {
  static hostnames = [URL_REGEX];

  render() {
    const { url } = this.props;
    const matches = url.match(URL_REGEX);
    if (!matches) return null;

    const videoId = matches[1];

    return (
      <iframe
        type="text/html"
        width="420"
        height="235"
        src={`http://www.youtube.com/embed/${videoId}?modestbranding=1`}
        frameBorder="0"
        title={`YouTube (${videoId})`}
      />
    );
  }
}

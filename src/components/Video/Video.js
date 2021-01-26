import React from 'react';
import PropTypes from 'prop-types';
import { Cloudinary, Util } from 'cloudinary-core';
import CloudinaryComponent from '../CloudinaryComponent';
import { extractCloudinaryProps } from '../../Util';

/**
 * A component representing a Cloudinary served video
 */
class Video extends CloudinaryComponent {
  mimeType = 'video';

  /**
   * Merge context with props
   * @return {*}
   */
  getMergedProps = () => {
    return { ...this.getContext(), ...this.props };
  };

  /**
   * Generate a video source url
   * @param cld - preconfigured cloudinary-core object
   * @param publicId - identifier of the video asset
   * @param childTransformations - child transformations for this video element
   * @param sourceTransformations - source transformations fot this video element
   * @param sourceType - format of the video url
   * @return {*}
   */
  generateVideoUrl = (
    cld,
    publicId,
    childTransformations,
    sourceTransformations,
    sourceType
  ) => {
    const sourceTransformation = sourceTransformations[sourceType] || {};
    const urlOptions = Util.defaults(
      {},
      sourceTransformation,
      childTransformations,
      {
        resource_type: 'video',
        format: sourceType,
      }
    );

    return cld.url(publicId, urlOptions);
  };

  /**
   * Generate <source> tags for this video element
   * @param cld - preconfigured cloudinary-core object
   * @param publicId - identifier of the video asset
   * @param childTransformations - child transformations fot this video element
   * @param sourceTransformations - source transformations for this video element
   * @param sourceTypes - formats for each video url that will be generated
   * @return {*}
   */
  generateSources = (
    cld,
    publicId,
    childTransformations,
    sourceTransformations,
    sourceTypes
  ) =>
    sourceTypes.map((sourceType) => {
      const src = this.generateVideoUrl(
        cld,
        publicId,
        childTransformations,
        sourceTransformations,
        sourceType
      );
      const mimeType = `${this.mimeType}/${
        sourceType === 'ogv' ? 'ogg' : sourceType
      }`;

      return <source key={mimeType} src={src} type={mimeType} />;
    });

  /**
   * Get props for the video element that will be rendered
   * @return {{tagAttributes: Object, sources: [<source>] | string}}
   */
  getVideoTagProps = () => {
    let {
      innerRef,
      publicId,
      fallback,
      children,
      sourceTypes,
      sourceTransformation = {},
      ...options
    } = this.getMergedProps();

    options = CloudinaryComponent.normalizeOptions(options, {});
    const {
      cloudinaryProps,
      cloudinaryReactProps,
      nonCloudinaryProps,
    } = extractCloudinaryProps(options);
    options = { ...cloudinaryProps, ...cloudinaryReactProps };

    //const snakeCaseOptions = toSnakeCaseKeys(options);
    const snakeCaseOptions = Util.withSnakeCaseKeys(options);
    const cld = Cloudinary.new(snakeCaseOptions);

    // Use cloudinary-core to generate this video tag's attributes
    let tagAttributes = cld.videoTag(publicId, options).attributes();
    tagAttributes = {
      ...Util.withCamelCaseKeys(tagAttributes),
      ...nonCloudinaryProps,
    };

    // Aggregate child transformations, used for generating <source> tags for this video element
    const childTransformations = this.getTransformation({
      ...options,
      children,
    });

    let sources = null;

    if (Util.isArray(sourceTypes)) {
      // We have multiple sourceTypes, so we generate <source> tags.
      sources = this.generateSources(
        cld,
        publicId,
        childTransformations,
        sourceTransformation,
        sourceTypes
      );
    } else {
      // We have a single source type so we generate the src attribute of this video element.
      tagAttributes.src = this.generateVideoUrl(
        cld,
        publicId,
        childTransformations,
        sourceTransformation,
        sourceTypes
      );
    }

    return { sources, tagAttributes };
  };

  reloadVideo = () => {
    if (this.element && this.element.current) {
      this.element.current.load();
    }
  };

  componentDidMount() {
    const { sources } = this.getVideoTagProps();
    const videoJsOptions = {
      autoplay: false,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      width: 720,
      height: 300,
      controls: true,
      sources,
    };
    // instantiate video.js
    this.player = videojs(
      this.videoNode,
      videoJsOptions,
      function onPlayerReady() {
        console.log('onPlayerReady', this);
      }
    );
  }

  componentDidUpdate() {
    // Load video on props change
    this.reloadVideo();
  }

  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  /**
   * Render a video element
   */
  render() {
    const { fallback, children } = this.props;

    const {
      tagAttributes, // Attributes of this video element
      sources, // <source> tags of this video element
    } = this.getVideoTagProps();

    return (
      <div data-vjs-player>
        <video
          ref={this.attachRef}
          {...tagAttributes}
          ref={(node) => (this.videoNode = node)}
          className="video-js"
        >
          {sources}
          {fallback}
          {children}
        </video>
      </div>
    );
  }
}

Video.propTypes = { publicId: PropTypes.string };
Video.defaultProps = {
  sourceTypes: Cloudinary.DEFAULT_VIDEO_PARAMS.source_types,
};

export default Video;

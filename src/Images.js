import React, { Component } from 'react';
import { connect } from 'react-redux';

class Images extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: [],
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    if (this.props.ytUrl) {
      this.fetchImages();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.ytUrl !== this.props.ytUrl && this.props.ytUrl) {
      this.setState({ images: [], loading: false, error: null });
      this.fetchImages();
    }
  }

  fetchImages = async () => {
    const videoUrl = this.props.ytUrl;
    if (!videoUrl) {
      this.setState({
        error: "No video URL provided.",
        loading: false,
      });
      return;
    }
    console.log('Fetching images for:', videoUrl);
    try {
      const response = await fetch('http://localhost:5000/get_images', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) {
        console.log('Response not ok');
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch images');
      }

      const data = await response.json();
      this.setState({
        images: data.frames || [],
        loading: false,
      });
      console.log(this.state.images);
    } catch (error) {
      console.error('Error fetching images:', error);
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  };

  render() {
    const { images, loading, error } = this.state;
    return (
      <div className="flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold mb-4">Extracted Frames</h1>
        {loading && <p className="text-gray-500">Fetching frames from video...</p>}
        {error && <p className="text-red-500">{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl">
          {images.map((img, i) => (
            <img
              key={i}
              src={`/frames/${img}`}
              alt={`Frame ${i}`}
              className="w-full h-auto rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
            />
          ))}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  ytUrl: state.ytUrl,
});

export default connect(mapStateToProps)(Images);

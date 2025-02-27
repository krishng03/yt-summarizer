import React, { Component } from 'react';
import { connect } from 'react-redux';

class Cards extends Component {
  constructor(props) {
    super(props);
    this.state = {
      flashcards: [],
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    if (this.props.ytUrl) {
      this.fetchFlashcards();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.ytUrl !== this.props.ytUrl && this.props.ytUrl) {
      this.setState({ loading: true, error: null, flashcards: [] });
      this.fetchFlashcards();
    }
  }

  fetchFlashcards = async () => {
    const videoUrl = this.props.ytUrl;
    if (!videoUrl) {
      this.setState({
        error: "No video URL provided.",
        loading: false,
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/get_flashcards', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Raw response:', data);

      if (data.flashcards) {
        this.setState({ 
          flashcards: data.flashcards, 
          loading: false 
        });
      } else {
        this.setState({ 
          error: 'No flashcards available', 
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      this.setState({ 
        error: `Error processing flashcards: ${error.message}`, 
        loading: false 
      });
    }
  };

  render() {
    const { flashcards, loading, error } = this.state;

    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Flashcards</h2>
        <div className="space-y-4">
          {loading && <p className="text-gray-500">Loading flashcards...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {flashcards.length > 0 ? (
            flashcards.map((card, index) => (
              <div key={index} className="p-4 bg-white shadow-md rounded-lg">
                <h3 className="font-semibold text-lg">{card.heading}</h3>
                <p className="text-gray-700">{card.description}</p>
              </div>
            ))
          ) : (
            !loading && <p className="text-gray-500">No flashcards available.</p>
          )}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  ytUrl: state.ytUrl,
});

export default connect(mapStateToProps)(Cards);

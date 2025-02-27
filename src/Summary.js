import React, { Component } from "react";
import { connect } from "react-redux";

class Summary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      summary: "",
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    if (this.props.ytUrl) {
      this.fetchSummary();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.ytUrl !== this.props.ytUrl && this.props.ytUrl) {
      this.setState({ loading: true, error: null, summary: "" });
      this.fetchSummary();
    }
  }

  fetchSummary = async () => {
    const videoUrl = this.props.ytUrl;
    if (!videoUrl) {
      this.setState({
        error: "No video URL provided.",
        loading: false,
      });
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/get_summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ summary: data.summary, loading: false });
      } else {
        this.setState({
          error: "Error fetching summary.",
          loading: false,
        });
      }
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  };

  render() {
    return (
      <div className="p-4 bg-gray-200 rounded-lg">
        <h2 className="text-xl font-bold">Video Summary</h2>
        {this.state.loading && (
          <p className="text-gray-500">Creating summary...</p>
        )}
        {this.state.error && <p className="text-red-500">{this.state.error}</p>}
        <p dangerouslySetInnerHTML={{ __html: this.state.summary }}></p>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  ytUrl: state.ytUrl,
});

export default connect(mapStateToProps)(Summary);

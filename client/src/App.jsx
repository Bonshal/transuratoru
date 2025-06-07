import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { use } from 'react';


function App() {
  const [image,setImage] = useState(null);
  const [japanese,setJapansese] = useState("");
  const [english, setEnglish] = useState('')
  const [loading, setLoading] = useState(false);

  const handleUpload  = async(e) =>{
    const file = e.target.files[0];
    setImage(URL.createObjectURL(file))
    const formData = new FormData()
    formData.append('image',file)

    setLoading(true)
    try{
      const response = await fetch('http://localhost:5001/api/ocr',{
      method: 'POST',
      body: formData
    })

    if (!response.ok) { // Check if response is ok
      const errorData = await response.json();
      console.error("Error from backend:", errorData);
      // Optionally, set an error state to display to the user
      setJapansese("Error processing image.");
      setEnglish("Please try again.");
      setLoading(false);
      return;
    }

    const data = await response.json();
    setJapansese(data.japanese)
    setEnglish(data.english)
  }catch(err)
  {
    console.log("failed to fetch",err)
    setJapansese("Network error or serer is down")
    setEnglish("Please check your connection and try again")
  }finally{
    setLoading(false);
  }
}

  return (
    <>
      <div>
        <h1>TRANSURATORU</h1>
        <input type="file" onChange={handleUpload} />
        {image && <img src={image} alt='uploaded' style={{maxWidth:'300px'}}/>}
        {loading && <p>processing...</p>}
        <div>
          <h3>Japanese</h3>
          <textarea value={japanese} readOnly rows={6} />
          <h3>English</h3>
          <textarea value={english} readOnly rows={6} />
        </div>
      </div>

    </>
  )
}

export default App

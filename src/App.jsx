import { useEffect, useRef, useState } from "react";
import LanguageSelector from "./components/LanguageSelector";
import Progress from "./components/Progress";

import "./App.css";

function App() {
  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState(
    "The red panda shares the giant panda's rainy, high-altitude forest habitat, but has a wider range. "
    + "Red pandas live in the mountains of Nepal and northern Myanmar (Burma), as well as in central China. "
    + "These animals spend most of their lives in trees and even sleep aloft."
  );
  const [translationStart, setTranslationStart] = useState(new Date());
  const [translationEnd, setTranslationEnd] = useState(new Date());
  const [sourceLanguage, setSourceLanguage] = useState("eng_Latn");
  const [targetLanguage, setTargetLanguage] = useState("hin_Deva");
  const [output, setOutput] = useState("");

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case "initiate":
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case "update":
          // Generation update: update the output text.
          setOutput((prev) => prev + e.data.output[0]?.translation_text);
          break;

        case "complete":
          // Generation complete: re-enable the "Translate" button
          setOutput(e.data.output[0]?.translation_text);
          setTranslationEnd(new Date());
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current.removeEventListener("message", onMessageReceived);
  });

  const translate = () => {
    setDisabled(true);
    setTranslationStart(new Date());
    setTranslationEnd(new Date());
    worker.current.postMessage({
      text: input,
      src_lang: sourceLanguage,
      tgt_lang: targetLanguage,
    });
  };

  return (
    <>
      <h1>NLLB-200</h1>
      <h2>No Language Left Behind!</h2>
      <p>
        The translation model 'facebook/nllb-200-distilled-600M' will be loaded
        in your browser to perform translations.
      </p>

      <div className="container">
        <div className="language-container">
          <LanguageSelector
            type={"Source"}
            defaultLanguage={"eng_Latn"}
            onChange={(x) => setSourceLanguage(x.target.value)}
          />
          <LanguageSelector
            type={"Target"}
            defaultLanguage={"hin_Deva"}
            onChange={(x) => setTargetLanguage(x.target.value)}
          />
        </div>

        <div className="textbox-container">
          <textarea
            value={input}
            rows={3}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>
          <textarea value={output} rows={3} readOnly></textarea>
        </div>
      </div>

      <div>
        <p>
          Translation time:{" "}
          {((translationEnd - translationStart) / 1000).toFixed(2)} seconds
        </p>
      </div>

      <button disabled={disabled} onClick={translate}>
        Translate
      </button>

      <div className="progress-bars-container">
        {ready === false && <label>Loading language models...</label>}
        {progressItems.map((data) => (
          <div key={data.file}>
            <Progress text={data.file} percentage={data.progress} />
          </div>
        ))}
      </div>
    </>
  );
}

export default App;

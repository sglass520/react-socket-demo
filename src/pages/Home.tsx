import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonPopover,
  IonInput,
} from "@ionic/react";
import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import "./Home.css";

import {
  SOCKET_ENDPOINT,
  COLOR_ARRAY,
  MIN_CIRCLE_SIZE,
  MAX_CIRCLE_SIZE,
  UPDATE_CLIENT_TIME,
  NAME_MAX_LENGTH,
  OFFSET_WIDTH,
  OFFSET_HEIGHT,
  CIRCLE_TEXT_FONT,
  CIRCLE_TEXT_COLOR,
} from "../constants";
import socketIOClient from "socket.io-client";

interface ClientProperties {
  uid: string;
  name: string;
  posX: number;
  posY: number;
  size: number;
  color: number;
  time: number;
}

const IState = {
  uid: "",
  name: "client",
  posX: 0,
  posY: 0,
  size: 0,
  color: 0,
  time: Date.now(),
};

const Home: React.FC = () => {
  const [response, setResponse] = useState<any>();
  const [clientName, setClientName] = useState<string>("");
  const [hasUpdated, setHasUpdated] = useState<boolean>(false);
  const [socket, setSocket] = useState<SocketIOClient.Socket>();
  const [getMouseDown, setMouseDown] = useState<boolean>(false);
  const [serverClients, setServerClients] = useState<any>(undefined);
  const [clientCircle, setClientCircle] = useState<ClientProperties>(IState);
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(true);

  const { register, handleSubmit, setValue } = useForm();

  const disableRef = useRef(submitDisabled);
  disableRef.current = submitDisabled;

  const clientRef = useRef(clientCircle);
  clientRef.current = clientCircle;

  const serverRef = useRef(serverClients);
  serverRef.current = serverClients;

  const mouseRef = useRef(getMouseDown);
  mouseRef.current = getMouseDown;

  const updatedRef = useRef(hasUpdated);
  updatedRef.current = hasUpdated;

  const socketRef = useRef(socket);
  socketRef.current = socket;

  function getRndInteger(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const createCircle = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: number,
    name: string
  ) => {
    context.fillStyle = COLOR_ARRAY[color];
    context.beginPath();
    context.arc(x, y, size, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    context.font = CIRCLE_TEXT_FONT;
    context.fillStyle = CIRCLE_TEXT_COLOR;
    context.textAlign = "center";
    context.fillText(name, x, y + 10);
  };

  const redraw = (x: number, y: number) => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    setClientCircle({
      ...clientRef.current,
      posX: x,
      posY: y,
      time: Date.now(),
    });
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      createCircle(
        context,
        x,
        y,
        clientRef.current.size,
        clientRef.current.color,
        clientName
      );
      // Only need to process if more than 1 client connected
      // The 1 client would be the single user which wouldn't get processed anyways
      if (serverRef.current && serverRef.current.length > 1) {
        serverRef.current.forEach((m: any) => {
          if (m.uid !== clientRef.current.uid) {
            createCircle(context, m.posX, m.posY, m.size, m.color, m.name);
          }
        });
      }
    }
  };

  const createClientCircle = (windowX: number, windowY: number) => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d");

    const randX = getRndInteger(0, windowX);
    const randY = getRndInteger(0, windowY - 75);
    const color = getRndInteger(0, COLOR_ARRAY.length - 1);
    const size = getRndInteger(MIN_CIRCLE_SIZE, MAX_CIRCLE_SIZE);

    setClientCircle({
      ...clientRef.current,
      name: clientName,
      posX: randX,
      posY: randY,
      size: size,
      color: color,
      time: Date.now(),
    });
    console.log("OK..", randX, randY, size);

    if (context) {
      //context.scale(dpr, dpr);
      createCircle(context, randX, randY, size, color, clientName);
    }
  };

  function handleMove(e: any, windowX: number, windowY: number) {
    if (
      e.type === "touchstart" ||
      e.type === "touchmove" ||
      e.type === "touchend" ||
      e.type === "touchcancel"
    ) {
      const evt = typeof e.originalEvent === "undefined" ? e : e.originalEvent;
      const touch = evt.touches[0] || evt.changedTouches[0];
      const x = touch.pageX;
      const y = touch.pageY - 115;
      // Prevent being moved outside the canvas
      if (y >= 0 && y <= windowY && x >= 0 && x <= windowX) {
        redraw(Math.floor(x), Math.floor(y));
      }
    }
  }

  const onLoad = () => {
    createClientCircle(
      window.innerWidth + OFFSET_WIDTH,
      window.innerHeight + OFFSET_HEIGHT
    );

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    redraw(clientRef.current.posX, clientRef.current.posY);
    setHasUpdated(true);

    // Start sending data to server
    window.setInterval(() => sendData(), UPDATE_CLIENT_TIME);

    canvas.addEventListener("mousedown", (e) => {
      redraw(e.offsetX, e.offsetY);
      setHasUpdated(true);
      setMouseDown(true);
    });

    canvas.addEventListener("mouseup", (e) => {
      redraw(e.offsetX, e.offsetY);
      setHasUpdated(true);
      setMouseDown(false);
    });

    canvas.addEventListener(
      "mousemove",
      (e) => {
        if (mouseRef.current) {
          redraw(e.offsetX, e.offsetY);
          setHasUpdated(true);
        }
      },
      false
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        handleMove(
          e,
          window.innerWidth + OFFSET_WIDTH,
          window.innerHeight + OFFSET_HEIGHT
        );
        setHasUpdated(true);
      },
      false
    );
  };

  const sendData = () => {
    if (updatedRef.current) {
      console.log(updatedRef.current, "updating...");
      if (socketRef.current) {
        socketRef.current.emit("update", clientRef.current);
      }
    }
    setHasUpdated(false);
  };

  useEffect(() => {
    if (!!clientName) {
      const socket = socketIOClient(SOCKET_ENDPOINT);
      setSocket(socket);

      socket.on("connected", (id: string) => {
        console.log("connected");

        setClientCircle({
          ...clientRef.current,
          uid: id,
          time: Date.now(),
        });

        socket.on("date", (data: any) => {
          setResponse(data);
        });

        socket.on("data", (data: any) => {
          setServerClients(data);
          redraw(clientRef.current.posX, clientRef.current.posY);
        });

        // Call Load in timeout because we need Canvas to be created in DOM first
        setTimeout(() => onLoad(), 500);
      });
      return () => {
        socket.disconnect();
      };
    }
    // eslint-disable-next-line
  }, [clientName]);

  const submitClientName = (data: any) => {
    console.log("Submit", data);
    if (!!data.clientName && data.clientName.trim().length > 1) {
      console.log("OK");
      setClientName(data.clientName);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Socket Demo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen scrollY={false}>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Socket Demo</IonTitle>
          </IonToolbar>
        </IonHeader>
        {!!clientName ? (
          <>
            <canvas
              id="canvas"
              width={window.innerWidth + OFFSET_WIDTH}
              height={window.innerHeight + OFFSET_HEIGHT}
              className="styleCanvas"
            ></canvas>
            <p>
              Server Time: <time dateTime={response}>{response}</time>
            </p>
          </>
        ) : (
          <IonPopover
            cssClass="popover-style"
            isOpen={!!clientName ? false : true}
            backdropDismiss={false}
          >
            <div className="popover-content">
              <h1>Socket Demo</h1>
              Enter a client username:
              <form onSubmit={handleSubmit(submitClientName)}>
                <IonInput
                  autofocus={true}
                  enterkeyhint="go"
                  inputmode="text"
                  maxlength={NAME_MAX_LENGTH}
                  name="clientName"
                  required={true}
                  placeholder="Client username"
                  mode="ios"
                  onIonChange={(e) => {
                    register("clientName");
                    setValue("clientName", e.detail.value!);
                    if (
                      !!e.detail.value &&
                      e.detail.value.trim().length > 1 &&
                      e.detail.value.trim().length <= NAME_MAX_LENGTH
                    ) {
                      setSubmitDisabled(false);
                    } else {
                      setSubmitDisabled(true);
                    }
                  }}
                ></IonInput>
                <IonButton
                  type="submit"
                  color="primary"
                  expand="block"
                  mode="ios"
                  disabled={disableRef.current}
                >
                  Connect
                </IonButton>
              </form>
            </div>
          </IonPopover>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;

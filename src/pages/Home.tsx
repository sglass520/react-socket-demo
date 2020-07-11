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
  API_ENDPOINT,
  CANVAS_SIZE,
  COLOR_ARRAY,
  MIN_CIRCLE_SIZE,
  MAX_CIRCLE_SIZE,
  UPDATE_CLIENT_TIME,
  NAME_MAX_LENGTH,
} from "../constants";
import uuid from "uuid";
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
  const [getTouches, setTouches] = useState<any>();
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
    context.font = "18px Verdana";
    context.fillStyle = "white";
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

  const createClientCircle = () => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const context = canvas.getContext("2d");

    const randX = getRndInteger(0, CANVAS_SIZE[0]);
    const randY = getRndInteger(0, CANVAS_SIZE[1] - 75);
    const color = getRndInteger(0, COLOR_ARRAY.length - 1);
    const size = getRndInteger(MIN_CIRCLE_SIZE, MAX_CIRCLE_SIZE);

    setClientCircle({
      uid: uuid.v4(),
      name: clientName,
      posX: randX,
      posY: randY,
      size: size,
      color: color,
      time: Date.now(),
    });
    console.log("OK..", randX, randY, size);

    if (context) {
      context.scale(dpr, dpr);
      createCircle(context, randX, randY, size, color, clientName);
    }
  };

  function handleMove(e: any) {
    if (
      e.type === "touchstart" ||
      e.type === "touchmove" ||
      e.type === "touchend" ||
      e.type === "touchcancel"
    ) {
      var evt = typeof e.originalEvent === "undefined" ? e : e.originalEvent;
      var touch = evt.touches[0] || evt.changedTouches[0];
      var x = touch.pageX;
      var y = touch.pageY - 115;
      if (y >= 0 && y <= CANVAS_SIZE[1] && x >= 0 && x <= CANVAS_SIZE[0]) {
        setTouches({ x: x, y: y });
        redraw(x, y);
      }
    }
  }

  const onLoad = () => {
    createClientCircle();

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    canvas.width = CANVAS_SIZE[0];
    canvas.height = CANVAS_SIZE[1];
    redraw(clientRef.current.posX, clientRef.current.posY);
    setHasUpdated(true);

    // window.addEventListener(
    //   "resize",
    //   () => {
    //     console.log("resizing");
    //     createClientCircle();
    //   },
    //   false
    // );

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
        handleMove(e);
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
      const socket = socketIOClient(API_ENDPOINT);
      setSocket(socket);
      socket.on("date", (data: any) => {
        setResponse(data);
      });
      socket.on("data", (data: any) => {
        setServerClients(data);
        redraw(clientRef.current.posX, clientRef.current.posY);
      });
      console.log("loading now");
      // Call Load in timeout because we need Canvas to be created in DOM first
      setTimeout(() => onLoad(), 500);
      window.setInterval(() => sendData(), UPDATE_CLIENT_TIME);
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
              width={CANVAS_SIZE[0]}
              height={CANVAS_SIZE[1]}
              className="styleCanvas"
            ></canvas>
            <p>
              Server Time: <time dateTime={response}>{response}</time>
            </p>
            {JSON.stringify(getTouches)}
            {CANVAS_SIZE[0]} {CANVAS_SIZE[1]}
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

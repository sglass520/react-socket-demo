import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
} from "@ionic/react";
import React, { useEffect, useState, useRef } from "react";
import "./Home.css";

import {
  API_ENDPOINT,
  CANVAS_SIZE,
  COLOR_ARRAY,
  MIN_CIRCLE_SIZE,
  MAX_CIRCLE_SIZE,
  UPDATE_CLIENT_TIME,
} from "../constants";
import uuid from "uuid";
import socketIOClient from "socket.io-client";

interface ClientProperties {
  uid: string;
  posX: number;
  posY: number;
  size: number;
  color: number;
  time: number;
}

const IState = {
  uid: "",
  posX: 0,
  posY: 0,
  size: 0,
  color: 0,
  time: Date.now(),
};

const Home: React.FC = () => {
  const [response, setResponse] = useState<any>();
  const [getTouches, setTouches] = useState<any>();
  const [hasUpdated, setHasUpdated] = useState<boolean>(false);
  const [socket, setSocket] = useState<SocketIOClient.Socket>();
  const [getMouseDown, setMouseDown] = useState<boolean>(false);
  const [clientCircle, setClientCircle] = useState<ClientProperties>(IState);

  const clientRef = useRef(clientCircle);
  clientRef.current = clientCircle;

  const mouseRef = useRef(getMouseDown);
  mouseRef.current = getMouseDown;

  const updatedRef = useRef(hasUpdated);
  updatedRef.current = hasUpdated;

  const socketRef = useRef(socket);
  socketRef.current = socket;

  function getRndInteger(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // function getMousePos(canvas: HTMLCanvasElement, evt: any) {
  //   const rect = canvas.getBoundingClientRect();
  //   return {
  //     x: evt.clientX - rect.left,
  //     y: evt.clientY - rect.top,
  //   };
  // }

  // function onMouseMove(canvas: HTMLCanvasElement, evt: any) {
  //   const mousePos = getMousePos(canvas, evt);
  //   redraw(mousePos.x, mousePos.y);
  // }

  const redraw = (x: number, y: number) => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    setClientCircle({
      ...clientRef.current,
      posX: x,
      posY: y,
      time: Date.now(),
    });
    setHasUpdated(true);
    console.log(clientRef.current);
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLOR_ARRAY[clientRef.current.color];
      ctx.beginPath();
      ctx.arc(x, y, clientRef.current.size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.font = "18px Verdana";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("stephen", x, y + 10);
    }
  };

  const createClientCircle = () => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");

    const randX = getRndInteger(0, CANVAS_SIZE[0]);
    const randY = getRndInteger(0, CANVAS_SIZE[1] - 75);
    const color = getRndInteger(0, COLOR_ARRAY.length - 1);
    const size = getRndInteger(MIN_CIRCLE_SIZE, MAX_CIRCLE_SIZE);

    setClientCircle({
      uid: uuid.v4(),
      posX: randX,
      posY: randY,
      size: size,
      color: color,
      time: Date.now(),
    });
    console.log("OK..", randX, randY, size);

    if (ctx) {
      ctx.scale(dpr, dpr);

      ctx.fillStyle = COLOR_ARRAY[color];
      ctx.beginPath();
      ctx.arc(randX, randY, size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.font = "18px Verdana";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("stephen", randX, randY + 10);
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
      setMouseDown(true);
    });

    canvas.addEventListener("mouseup", (e) => {
      redraw(e.offsetX, e.offsetY);
      setMouseDown(false);
    });

    canvas.addEventListener(
      "mousemove",
      (e) => {
        if (mouseRef.current) {
          redraw(e.offsetX, e.offsetY);
        }
      },
      false
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        handleMove(e);
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
    const socket = socketIOClient(API_ENDPOINT);
    setSocket(socket);
    socket.on("date", (data: any) => {
      setResponse(data);
    });

    socket.on("data", (data: any) => {
      console.log(data);
    });

    window.addEventListener("load", onLoad);
    window.setInterval(() => sendData(), UPDATE_CLIENT_TIME);

    return () => {
      socket.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Blank</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Blank</IonTitle>
          </IonToolbar>
        </IonHeader>
        <canvas
          id="canvas"
          width={CANVAS_SIZE[0]}
          height={CANVAS_SIZE[1]}
          className="styleCanvas"
        ></canvas>
        <p>
          It's <time dateTime={response}>{response}</time>
        </p>
        {JSON.stringify(getTouches)}
        {CANVAS_SIZE[0]} {CANVAS_SIZE[1]}
      </IonContent>
    </IonPage>
  );
};

export default Home;

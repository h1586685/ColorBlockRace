import './styles/page.css';
import './styles/color-block.css';
import './styles/game-status.css';
import { useEffect, useRef, createContext, useContext, useState } from 'react';
import { setText, socket, windowResolution } from './Helpers';
import { PopupWaitWindow, PopUpCountDownWindow, PopUpResultWindow } from './PopupInterface';
import { useSpring, animated } from '@react-spring/web';

const blockCount = 16; // 方格數
const colorDeliver = createContext(null);
const initialColorSample = '#ffffff';

// 遊戲介面
function ColorBlock({ isPlayer }) {
  const sideBlockName = isPlayer ? 'user_color_blocks' : 'opponent_color_blocks';
  const divRef = useRef(null);
  const serverGenerationColor = useContext(colorDeliver); // 從parent拿取context

  const handleClick = () => {
    if (isPlayer) {
      const hexColor = getBlockColor();
      socket.emit('click_block', hexColor); // 向socket server發送click event
    }
  };

  // serverGenerationColor變更時，重新render
  useEffect(() => {
    divRef.current.style.backgroundColor = serverGenerationColor;
  }, [serverGenerationColor]); // ,[serverGenerationColor]為綁定的variable

  return (
    <div
      onClick={handleClick}
      className={sideBlockName}
      ref={divRef}
    />
  );

  function getBlockColor() {
    const rgbToHex = (rgb) => {
      // 將 RGB 色票值拆解為紅、綠、藍三個色值
      const [r, g, b] = rgb.match(/\d+/g);

      // 將各個色值轉換為十六進制字串
      const hexR = parseInt(r, 10).toString(16).padStart(2, '0');
      const hexG = parseInt(g, 10).toString(16).padStart(2, '0');
      const hexB = parseInt(b, 10).toString(16).padStart(2, '0');

      // 組合成 HEX 色票值並回傳
      return `#${hexR}${hexG}${hexB}`;
    };
    const computedStyle = window.getComputedStyle(divRef.current); // 取得div的style
    const currentBackgroundColor = computedStyle.backgroundColor;
    const hexColor = rgbToHex(currentBackgroundColor);
    return hexColor;
  }
}

function FrameOfBlock({ isPlayer }) {
  const elements = Array.from({ length: blockCount }, (_, index) => index + 1);
  const sideFrameName = isPlayer ? 'frame_of_block' : 'opponent_frame_of_block';
  const prefixOfProviderKey = isPlayer ? 'POCB' : 'POOCB';
  const prefixOfColorBlock = isPlayer ? 'CB' : 'OCB';
  const { colorVars , setRandomBlockColor } = useColorSample();

  // 從server更新顏色，data = { socket.id, color }
  socket.on('update_color', ({ id, color }) => {
    const isMine = id === socket.id;
    const { rand_index, answer, main } = color;

    setRandomBlockColor(isMine, rand_index, answer, main);
  });

  return (
    <div className={sideFrameName}>
      {elements.map((_, index) => (
        <colorDeliver.Provider
          value={isPlayer ? colorVars.user[index] : colorVars.opponent[index]}
          key={prefixOfProviderKey + index}
        >
          <ColorBlock key={prefixOfColorBlock + index} isPlayer={isPlayer} />
        </colorDeliver.Provider>
      ))}
    </div>
  );

  function useColorSample() {
    const [colorVars, setColorVars] = useState({
      user: Array.from({ length: blockCount }, () => initialColorSample),
      opponent: Array.from({ length: blockCount }, () => initialColorSample)
    }); //透過變更colorVars的數值，可以更改方塊顏色

    /**
    * [變更方塊顏色]
    * @param  {[boolean]} isPlayer [設定的是否為user side的方塊]
    * @param  {[number]} index [方塊的索引，介於0~blockCount之間]
    * @param  {[String]} colorSample [16進制色票]
    */
    const setBlockColor = (isPlayer, index = 0, colorSample) => {
      index = Math.min(blockCount - 1, Math.max(0, index));

      setColorVars(prevColorVars => {
        const targetArray = isPlayer ? prevColorVars.user : prevColorVars.opponent;
        const updatedArray = [...targetArray];
        updatedArray[index] = colorSample;
        // {...preColorVars, user: updatedArray } 將prevColorVars複製到一個新的物件中，並修改user的部分
        return isPlayer
          ? { ...prevColorVars, user: updatedArray }
          : { ...prevColorVars, opponent: updatedArray };
      });
    };

    /**
    * [填滿全部方格]
    * @param  {[boolean]} isPlayer [設定的是否為user side的方塊]
    * @param  {[String]} colorSample [16進制色票]
    */
    const setAllBlockColor = (isPlayer,colorSample)=>{
      setColorVars(prevColorVars => {
        const targetArray = isPlayer ? prevColorVars.user : prevColorVars.opponent;
        let updatedArray = [...targetArray];
        updatedArray = targetArray.fill(colorSample);

        return isPlayer
          ? { ...prevColorVars, user: updatedArray }
          : { ...prevColorVars, opponent: updatedArray };
      });
    };

    /**
    * [填充一格方塊為主要顏色，剩餘的填充次要顏色]
    * [mainColorIndex將填充一格主要色票，剩餘將填充次要色票]
    * @param  {[boolean]} isPlayer [設定的是否為user side的方塊]
    * @param  {[String]} mainColorIndex [要設置的主要方塊索引]
    * @param  {[String]} mainColorSample [主要的16進制色票]
    * @param  {[String]} secendColorSample [次要的16進制色票]
    **/
    const setRandomBlockColor = (isPlayer,mainColorIndex,mainColorSample,secendColorSample) => {
      setAllBlockColor(isPlayer,secendColorSample);
      setBlockColor(isPlayer,mainColorIndex,mainColorSample);
    };

    return { colorVars ,setRandomBlockColor };
  }
}

function GameStatus() {
  const [timer, setTimer] = useState(60);
  const [roundCounter, setRoundCounter] = useState(1);
  const [showTimer, setShowTimer] = useState(false);
  const [countDownTimer, setCountDownTimer] = useState(3);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const initialConutMessage = 'ROUND  ';
  const [showResult, setShowResult] = useState(false);
  const [ranking, setRanking] = useState(0);
  const [isDisconnected, setisDisconnected] = useState(false);
  const [disconnectCounter, setDisconnectCounter] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);

  // 更新回合時間
  socket.on('timer', (sec) => { setTimer(sec); });

  // 新回合，socket更新回合計數器
  socket.on('new_round', (round) => {
    setRoundCounter(round);
    setTimer(60);
  });

  // 遊戲開始，顯示回合計時器
  socket.on('game_start_count', () => {
    setShowTimeUp(false);
    isNaN(roundCounter) && setRoundCounter(1);
    setShowTimer(true);
  });

  // 回合結束，顯示時間到
  socket.on('times_up', () => { setShowTimeUp(true)});

  // 遊戲開始，隱藏PopUpWindow
  socket.on('game_start', () => {
    setShowTimer(false);
    setShowTimeUp(false);
  });

  useEffect(() => {
    let messageUpdater = null;
    if (showTimer) {
      let i = 2;
      messageUpdater = setInterval(() => {
        setCountDownTimer(i);
        i--;
      }, 1000);
    }

    return () => {
      setCountDownTimer(3);
      showTimer && setShowTimer(false);
      clearInterval(messageUpdater);
    };
  }, [showTimer]);

  // 遊戲結束，顯示結果
  socket.on('game_finished', (winner) => {
    setShowTimer(false);
    setShowTimeUp(false);
    setShowResult(true);
    setIsGameOver(true);

    if (winner === 'TIE') {
      setRanking(0);
    } else if (winner === socket.id) {
      setRanking(1);
    } else {
      setRanking(2);
    }
  });

  // 玩家斷線，顯示計數器
  socket.on('opponent_disconnected', () => { 
    setShowTimer(false);
    setShowTimeUp(false);
    setShowResult(isGameOver ? true : false);
    setisDisconnected(isGameOver ? false : true);
  })

  useEffect(() => {
    let messageUpdater = null;

    if (isDisconnected && !isGameOver) {
      messageUpdater = setInterval(() => {
        setDisconnectCounter(prevCounter => {
          const newCounter = prevCounter - 1;
          if (newCounter === 0) {
            clearInterval(messageUpdater);
            window.location.reload(false);
          }
  
          return newCounter;
        });
      }, 1000);
    }

    return () => {
      clearInterval(messageUpdater);
    };
  }, [isDisconnected]);

  return (
    <>
      <div id="game_status">
        <div id="timer"> {timer} </div>
        <div className="round_status">
          Round :<span id='user_round_text'> {roundCounter} </span></div>
      </div>

      { showTimer
        && <PopUpCountDownWindow title = {
          '\u2003' + '\u2003' + initialConutMessage + '\u2002' + roundCounter + '\u2003' + '\u2003'} 
          context = {`- ${countDownTimer} -`} />}

      { showTimeUp && <PopupWaitWindow context="TIMES UP!" />}

      { showResult && <PopUpResultWindow rank={ranking} />}

      { isDisconnected
      && <PopupWaitWindow
      context={(
          <>
            <div>OPPONENT DISCONNECTED</div>
            <div style={ { textAlign: 'center'} }>{`REFRESH: ${disconnectCounter}`}</div>
          </>
        )}>
      </PopupWaitWindow> }
    </>
  );
}

/**
 * [將網頁分為user與opponent兩邊]
 * @param {[React.JSX.Element]} userSide [user顯示內容] 
 * @param {[React.JSX.Element]} opponentSide [opponent顯示內容]
 */
function SplitSide({ userSide, opponentSide }) {
  return (
    <div className="split_interface">
      <div className="user_side">
        <div className="section">{userSide}</div>
      </div>

      <div className="opponent_side">
        <div className="section">{opponentSide}</div>
      </div>
    </div>
  );
}

function PlayerOperationArea() {
  // 配對後，更新對手名字
  socket.on('paired', (name) => {
    setText('opponent_name', name);
  });

  return (
    <SplitSide
      userSide={
          <>
            <div id='user_name'>user name</div>
            <FrameOfBlock isPlayer={true} />
          </>
        }
      opponentSide={
          <>
            <div id='opponent_name'>opponent name</div>
            <FrameOfBlock isPlayer={false} />
          </>
        }
      />
  );
}

function PlyerStatus() {
  const [userScoreCounter,setUserScoreCounter] = useState(0);
  const [userWrongCount,setUserWrongCount] = useState(0);
  const [isMinused,setIsMinused] = useState(null);
  const [isWrongCountAnimated, setIsWrongCountAnimated] = useState([false,false,false]);
  const [userWinCounter,setUserWinCounter] = useState(0);
  const [opponentScoreCounter,setOpponentScoreCounter] = useState(0);
  const [opponentWinCounter, setOpponentWinCounter] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isLead, setIsLead] = useState(null);
  const resolution = windowResolution.useResolution();


  // 新回合，socket重製元件
  socket.on('new_round', () => {
    setUserScoreCounter(0);
    setOpponentScoreCounter(0);
    setUserWrongCount(0);
  });

  // 更新分數
  socket.on('score_update', (data) => {
    let isMine = data.id === socket.id;
    isMine ? setUserScoreCounter(data.score) : setOpponentScoreCounter(data.score);
  });

  // 錯誤計數器狀態更新
  const handleWrongCountAnimated = (index, isWrongCountAnimated) => {
    setIsWrongCountAnimated((prev) => {
      const newIsWrongCountAnimated = [...prev];
      newIsWrongCountAnimated[index] = isWrongCountAnimated;
      return newIsWrongCountAnimated;
    });
  };

  socket.on('wrong_count_update', (wrong_counter) => {
    setUserWrongCount(wrong_counter);
  });

  // 更新錯誤計數器動畫
  useEffect(()=>{
    if (userWrongCount === 0){
      if (isMinused){
        handleWrongCountAnimated(2,true);
        setTimeout(() => {
          for (let i = 0;i<=2;i++){
            handleWrongCountAnimated(i,false);
          }
          setIsMinused(false);
        }, 300);
      }
    }
    else {
      handleWrongCountAnimated(userWrongCount-1,true); 
      if (userWrongCount === 2) {
        handleWrongCountAnimated(0,true);
        setIsMinused(true)
      };
    }
  },[userWrongCount]);

  // 更新獲勝計數器
  socket.on('update_win_count', (data) => {
    for (let i = 0; i < data.length; i++) {
      const isMine = data[i].id === socket.id;
      isMine ? setUserWinCounter(data[i].win_count) : setOpponentWinCounter(data[i].win_count);
    }
  });

  // 手機模式介面更新
  useEffect(()=>{
    const isMobile = resolution.width <= 650;
    const isLead = userScoreCounter > opponentScoreCounter ? true : false;
  
    setIsMobile(isMobile);
    setIsLead(isMobile && isLead);
  },[resolution.width,userScoreCounter,opponentScoreCounter]);

  return (
    <>
      {(!isMobile 
        &&(
        <SplitSide
          userSide={(
            <div className='user_status_bar'>
              {WrongCountBar(isWrongCountAnimated)}
              <div id='user_score'>{userScoreCounter}</div>
              <div className='win_count_status'>
                Win Count : <span id='user_win_count_text'>{userWinCounter} </span>
              </div>
            </div>
          )}
          opponentSide={(
            <div className='opponent_status_bar'>
              <div id="opponent_wrong_count">&emsp;</div> {/*&emsp; = 空白字元*/}
              <div id="opponent_score">{opponentScoreCounter}</div>
              <div className="win_count_status">
                Win Count : <span id="opponent_win_count_text">{opponentWinCounter}</span>
              </div>
            </div>
          )}
        />)
      )}

      {isMobile 
        && (
        <SplitSide
          userSide={(
            <div className='user_status_bar'>
              {WrongCountBar(isWrongCountAnimated)}
              <div id='user_score' style={isLead ? { color: 'rgb(78, 162, 235)' } : {}}>{userScoreCounter}</div>
              <div className='win_count_status'>
                <span id='user_win_count_text'> {userWinCounter} </span>
                <span id='opponent_win_count_text'>{`  : ${opponentWinCounter}`}</span>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}

function WrongCountBar(isWrongCountAnimated) {
  const firstWrongCountAnimate = useSpring({
    backgroundColor: isWrongCountAnimated[0] ? "red" : "rgb(215, 203, 203)" ,
  });

  const secondWrongCountAnimate = useSpring({
    backgroundColor: isWrongCountAnimated[1] ? "red" : "rgb(215, 203, 203)" ,
  });

  const thirdWrongCountAnimate = useSpring({
    backgroundColor: isWrongCountAnimated[2] ? "red" : "rgb(215, 203, 203)" ,
    height: isWrongCountAnimated[2] ? 18:10,
  });

  return (
    <div id='user_wrong_count_container'>
      <animated.div id='user_wrong_count_block' style={firstWrongCountAnimate} />
      <animated.div id='user_wrong_count_block' style={secondWrongCountAnimate} />
      <animated.div id='user_wrong_count_minus_block' style={thirdWrongCountAnimate}>
        <animated.div id="user_wrong_count_content"
          style={{ visibility: isWrongCountAnimated[2] ? 'visible' : 'hidden' }}>-1</animated.div>
      </animated.div>
    </div>
  );
}

function GameInterface() {
  return (
    <>
      <GameStatus/>
      <PlayerOperationArea/>
      <PlyerStatus />
    </>
  );
}

export default GameInterface;

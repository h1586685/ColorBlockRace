import './styles/popup-interface.css';
import { useState, useEffect } from 'react';
import { setText, socket } from './Helpers';
import { useSpring, animated } from 'react-spring';
import sample1Img from './img/sample1.png';
import sample2Img from './img/sample2.png';
import tipImg from './img/tip.png';

function Background() {
  return (
    <div id="window-cover"/>
  );
}

function PopUpWindow({ context }) {
  const zoomInProps = useSpring({
    from: { transform: 'scale(0)' },
    to: { transform: 'scale(1)' },
    config: { tension: 150  , friction: 17 },
  });

  return (
    <>
      <Background />
      <animated.div style={zoomInProps} 
        id="pop_up_window">{context}
      </animated.div>
    </>
  );
}

export function PopUpLoginWindow() {
  const gameTitle = 'Color Block Race';
  const gameSubtitle = 'Find the block that was HIDDEN !';
  const gameIcon = '👁️‍🗨️';
  const maxLengthVar = '20'; // 名字最大長度
  const [userName, setUserName] = useState('');
  const [isNotLogin, setIsNotLogin] = useState(true);
  const [isShowWindow, setIsShowWindow] = useState(true);
  const [isInvalidName, setIsInvalidName] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [isHovered, setIsHovered] = useState([false,false]); 
  const [isShowGuide, setIsShowGuide] = useState(false);

  // 登入成功後修改名字
  const loginButtonClicked = () => {
    // 正規表達式 /s 代表匹配任何空白字元
    const isValidUserName = !/\s/.test(userName) && userName !== "";
    if (isValidUserName) {
      setIsNotLogin(false);
      setText('user_name', userName);
      setIsPairing(true);

      // emit to server
      socket.emit('name_set', userName);
    } else {
      setIsInvalidName(true);
    }
    setIsShowWindow(false);
  };

  const guideButtonClicked = () => {
    setIsShowGuide(true);
    setIsShowWindow(false);
  }

  // 遊戲開始，隱藏PopUpWindow
  socket.on('game_start_count', () => {
    setIsPairing(false);
  });

  const guideButtonAnimate = useSpring({
    transform: isHovered[0] ? 'translateX(-1%) translateY(-1%)' : 'translateX(0%) translateY(0%)',
    boxShadow: isHovered[0] ? '2px 3px rgba(42, 47, 51, 0.7)' : '0px 0px rgba(0, 0, 0, 0)',
    config: { tension: 50, friction: 14 },
  });
  
  const loginButtonAnimate = useSpring({
    transform: isHovered[1] ? 'translateX(-1%) translateY(-1%)' : 'translateX(0%) translateY(0%)',
    boxShadow: isHovered[1] ? '3px 4px rgba(82, 31, 24, 0.7)' : '0px 0px rgba(0, 0, 0, 0)',
    config: { tension: 65, friction: 14 },
  });

  const handleHover = (index, isHovered) => {
    setIsHovered((prevIsHovered) => {
      const newIsHovered = [...prevIsHovered];
      newIsHovered[index] = isHovered;
      return newIsHovered;
    });
  };

  return (
    <>
      { isNotLogin && isShowWindow
        && (
        <PopUpWindow
          context={(
            <div id="login-panel">
              <div id="game_title">{gameTitle}</div>
              <div id="game_subtitle">{gameSubtitle}</div>
              <div id="ur_i">{gameIcon}</div> 
              <animated.button id="guide_button" onClick={guideButtonClicked}
              style={guideButtonAnimate}
              onMouseEnter={() => handleHover(0, true)}
              onMouseLeave={() => handleHover(0, false)}
              >i</animated.button>
              <div>
                Your name：
                <input
                  maxLength={maxLengthVar}
                  type="text"
                  id="input_user_name"
                  className="info-text-input"
                  onChange={(e) => { setUserName(e.target.value); }}
                />
              </div>
              <animated.button id="login_button" onClick={loginButtonClicked} 
                style={loginButtonAnimate}
                onMouseEnter={() => handleHover(1, true)}
                onMouseLeave={() => handleHover(1, false)}
                >START</animated.button>
            </div>
          )}
        />
        )}
      { isInvalidName
        && (
        <PopUpMessageWindow
          title="Invalid Name"
          message="Name include illegon character, Please try again"
          onClose={() => { setIsInvalidName(false); setIsShowWindow(true); }}
        />
        )}

      { isPairing
        && <PopupWaitWindow onClose={() => setIsPairing(false)} />}

      { isShowGuide
        && <PopUpGuideWindow onClose={()=>{ setIsShowGuide(false); setIsShowWindow(true);}}/>
      }
    </>
  );
}

/**
 * [彈出訊息視窗]
 * @param {[String]} title [視窗的標題]
 * @param {[String]} message [顯示訊息]
 * @param {[Function]} onClose [回傳關閉function]
 * */
function PopUpMessageWindow({ title, message, onClose }) {
  const [isHovered, setIsHovered] = useState(false); 

  const handleClick = () => {
    onClose();
  };

  const buttonFloatAnimate = useSpring({
    transform:  isHovered ? 'translateX(-1%) translateY(-1%)' : 'translateX(0%) translateY(0%)',
    boxShadow: isHovered ? '2px 3px rgba(82, 31, 24, 0.7)' : '0px 0px rgba(0, 0, 0, 0)',
    config: { tension: 120, friction: 14 },
  });

  return (
    <PopUpWindow
      context={(
        <div id="message_box">
          <div id="message_title">{title}</div>
          <div id="message_context">{message}</div>
          <animated.button id="message_button" onClick={handleClick} 
            style={buttonFloatAnimate}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            >Confirm</animated.button>
        </div>
      )}
    />
  );
}

/**
 * [等待提示視窗]
 * @param {[String]} context [顯示內容]
 * @param {[Function]} onClose [回傳關閉function]
 */
export function PopupWaitWindow({ context = '', onClose }) {
  const initialWaitingMessage = 'Wait for another player connect';
  const [dotCounter, setDotCounter] = useState('');
  const [isContextVoid] = useState((context === ''));
  const displayWaitMessage = isContextVoid ? initialWaitingMessage : context;

  useEffect(() => {
    let messageUpdater = null;
    if (isContextVoid) {
      messageUpdater = setInterval(() => {
        setDotCounter((preDotCounter) => {
          const nextCounter = preDotCounter.length;
          if (nextCounter === 4) {
            return '';
          }
          return preDotCounter + '.';
        });
      }, 1000);

      return () => {
        clearInterval(messageUpdater);
      };
    }
  }, [isContextVoid]);

  socket.on('paired', () => { onClose(); });

  return (
    <>
      {isContextVoid
      && (
      <PopUpWindow
        context={(
          <div id="waiting-message-box">
            <div id="loading_text">{displayWaitMessage + dotCounter}</div>
          </div>
        )}
      />
      )}

      {!isContextVoid
      && (
      <PopUpWindow
        context={(
          <div id="waiting-message-box">
            <div id="loading_text">{displayWaitMessage}</div>
          </div>
      )}
      />
      )}
    </>
  );
}

export function PopUpCountDownWindow({ title = '', context = '' }){
  const [playForward, setPlayForward] = useState(true);

  const zoomFadeProps = useSpring({
    from: { opacity: playForward ? 0 : 0.98 },
    to: { opacity: playForward ? 0.98 : 0 },
    config: { tension: 70, friction: 14 },
    onRest: () => {
      setTimeout(() => {
        setPlayForward((prev) => !prev);
      }, 1700); // 1.7秒後自動切換播放狀態
    },
  });

  const pushDown = useSpring({
    from: { transform: playForward ? 'translateY(-100%)' : 'translateY(0%)' },
    to: { transform: playForward ? 'translateY(0%)' : 'translateY(-100%)' },
    config: { tension: 120, friction: 20 },
  });

  const pushUp = useSpring({
    from: { transform: playForward ? 'translateY(100%)' : 'translateY(0%)' },
    to: { transform: playForward ? 'translateY(0%)' : 'translateY(100%)' },
    config: { tension: 120, friction: 20 },
  });

  const pushLeft = useSpring({
    from: { transform: 'translateX(1800%)', opacity:0 },
    to: { transform: 'translateX(1300%)', opacity:1 },
    config: { tension: 120, friction: 20 },
  });

  const pushLittleLeft = useSpring({
    from: { transform: 'translateX(4000%)', opacity:0 },
    to: { transform: 'translateX(4200%)', opacity:1 },
    config: { tension: 100, friction: 20 },
  });

  const pushRight = useSpring({
    from: { transform: 'translateX(-1800%)', opacity:0 },
    to: { transform: 'translateX(-1300%)', opacity:1 },
    config: { tension: 120, friction: 20 },
  });

  const pushLittleRight = useSpring({
    from: { transform: 'translateX(-4000%)', opacity:0 },
    to: { transform: 'translateX(-4200%)', opacity:1 },
    config: { tension: 100, friction: 20 },
  });

  const commonConfig = {
    transform: { tension: 20, friction: 12 },
    others: { tension: 12, friction: 20 },
  };

  const titleAnimate = useSpring({
    from: {background: `linear-gradient(120deg, #a2c3de 0%, #83b4c9 100%)`, transform:'translateY(-40%)', opacity:0 },
    to: {background: `linear-gradient(120deg,#8ea4ad 0%, #8396a8 100%)`, transform:'translateY(0%)', opacity:1 },
    config: commonConfig,
  });
  

  return (
    <div id = "countdown-window-container">
      <animated.div id="countdown-window-cover" style={pushDown}/>
      <animated.div 
      style={zoomFadeProps} 
      id="countdown-message-box">
        <animated.div id="countdown-title" style={titleAnimate}>{title}</animated.div>
        <animated.div id="countdown-slash" style={pushRight}/>
        <animated.div id="countdown-sub-slash" style={pushLittleRight}/>
        <div id="countdown-message">{context}</div>
        <animated.div id="countdown-slash" style={pushLeft}/>
        <animated.div id="countdown-sub-slash" style={pushLittleLeft}/>
      </animated.div>
      <animated.div id="countdown-window-cover" style={pushUp}/>
    </div>
  )
}

/**
 * @param {[Number]} rank [0 = tie, 1 = win, 2 = lose] 
 */
export function PopUpResultWindow({ rank = 0 }){
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () =>{
    window.location.reload(false);
  };

  const resultMessage = 
    rank === 0 ? ' A Tie! ' : rank === 1 ? ' You Win! ' : ' You Lose! ';

  const zoomFadeProps = useSpring({
    from: { opacity: 0 },
    to: { opacity: 0.98},
    config: { tension: 70, friction: 14 },
  });

  const pushLeft = useSpring({
    from: { transform: 'translateX(200%)' },
    to: { transform: 'translateX(0%)' },
    config: { tension: 120, friction: 20 },
  });

  const pushRight = useSpring({
    from: { transform: 'translateX(-200%)' },
    to: { transform: 'translateX(0%)' },
    config: { tension: 120, friction: 20 },
  });

  const commonConfig = {
    transform: { tension: 20, friction: 12 },
    others: { tension: 20, friction: 20 },
  };

  const defeatedAnimate = useSpring({
    from: {background: `linear-gradient(120deg, #f093fb 0%, #f5576c 100%)`, transform:'translateY(-40%)', opacity:0.5 },
    to: {background: `linear-gradient(120deg, #f5576f 0%, #f73e59 100%)`, transform:'translateY(0%)', opacity:1 },
    config: commonConfig,
  });

  const winAnimate = useSpring({
    from: {background: `linear-gradient(120deg, #65e6ea 0%, #2e65d1 100%)`, transform:'translateY(-40%)', opacity:0.5 },
    to: {background: `linear-gradient(120deg,#4897d4 0%, #3e7ff7 100%)`, transform:'translateY(0%)', opacity:1 },
    config: commonConfig,
  });

  const tieAnimate = useSpring({
    from: {background: `linear-gradient(120deg, #a2c3de 0%, #83b4c9 100%)`, transform:'translateY(-40%)', opacity:0.5 },
    to: {background: `linear-gradient(120deg,#8ea4ad 0%, #8396a8 100%)`, transform:'translateY(0%)', opacity:1 },
    config: commonConfig,
  });

  const rotateProps = useSpring({
    transform: `rotate(${isHovered ? 360 : 0}deg)`,
    config: { tension: 70, friction: 50 },
  });
  
  return (
    <div id = "result-window-container">
      <animated.div id="result-window-cover" style={pushRight}/>
      <animated.div style={ zoomFadeProps } id="result-message-box">
        <animated.div id="result-title" style={tieAnimate}>
        &ensp;&emsp;&emsp;//&emsp;GAME OVER&emsp;//&emsp;&emsp;&ensp;</animated.div>
        <div style={{ height: "5px" }} />
        <animated.span id="result-message-container" style={
            rank === 0 ? tieAnimate : rank === 1 ? winAnimate : defeatedAnimate}>
          <animated.div id="result-hyphen" style={pushRight}>&ensp;-&ensp;</animated.div>
          <div id="result-message">{resultMessage}</div>
          <animated.div id="result-hyphen" style={pushLeft}>&ensp;-&ensp;</animated.div>
        </animated.span>
        <div style={{ height: "30px" }} />
        <animated.div id = "refresh-button" style={rotateProps}
          onClick={handleClick} 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}></animated.div>
      </animated.div>
      <animated.div id="result-window-cover" style={pushLeft}/>

    </div>
  )
}

function PopUpGuideWindow({ onClose }){
  const [isHovered, setIsHovered] = useState([false,false]); 

  const stepAnimate = useSpring({
    transform: isHovered[0] ? 'translateX(-1%) translateY(-3%)' : 'translateX(0%) translateY(0%)',
    boxShadow: isHovered[0] ? '5px 4px rgba(42, 47, 51, 0.7)' : '0px 0px rgba(0, 0, 0, 0)',
    config: { tension: 60, friction: 14 },
  });

  const tipAnimate = useSpring({
    transform: isHovered[1] ? 'translateX(-1%) translateY(-3%)' : 'translateX(0%) translateY(0%)',
    boxShadow: isHovered[1] ? '5px 4px rgba(42, 47, 51, 0.7)' : '0px 0px rgba(0, 0, 0, 0)',
    config: { tension: 60, friction: 14 },
  });

  const handleHover = (index, isHovered) => {
    setIsHovered((prevIsHovered) => {
      const newIsHovered = [...prevIsHovered];
      newIsHovered[index] = isHovered;
      return newIsHovered;
    });
  };

  const title = 'How to Play?';
  const step1 = 
    <animated.div className="step_container"
      style={stepAnimate}
      onMouseEnter={() => handleHover(0, true)}
      onMouseLeave={() => handleHover(0, false)}>
      <div id = "guide_subtitle" >Step 1</div>
      <img id = "step_1_guide_img" src={sample1Img}/>
      <div id = "step_1_text">Find the hidden block and click on it</div>
    </animated.div>

  const step2 = 
    <animated.div className="step_container"
      style={stepAnimate}
      onMouseEnter={() => handleHover(0, true)}
      onMouseLeave={() => handleHover(0, false)}>
      <div id = "guide_subtitle">Step 2</div> 
      <img id = "step_2_guide_img" src={sample2Img}/>
      <div id = "step_2_text">Get score to beat your opponent</div>
    </animated.div>

  const tip =
    <animated.div className="step_container"
      style={tipAnimate}
      onMouseEnter={() => handleHover(1, true)}
      onMouseLeave={() => handleHover(1, false)}>
      <div id = "guide_subtitle">Tip</div> 
      <img id = "tip_img" src={tipImg}/>
      <div id = "step_3_text">The score decreases <br/> every third incorrect click</div>
    </animated.div>

  return (
    <>
      <div id ="guide_container">
      <PopUpMessageWindow title={title} onClose={onClose} message={
        <>
          <div style={{height:"10px", height:"10px"}}/>
          <div id ="step_container">
            {step1}
            <div className = "step_gap"/>
            {step2}
            <div className = "step_gap"/>
            {tip}
          </div>
          <div style={{height:"15px", height:"15px"}}/>
        </>
      }/>
      </div>
    </>
  );
}

export default PopUpWindow;

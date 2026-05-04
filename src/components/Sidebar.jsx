// import { useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "./context/AuthContext"; 

// // const NAV = [
// //   { id:'dashboard', label:'Dashboard',  icon:'▦' },
// //   { id:'chat',      label:'Co-pilot',   icon:'◎' },
// //   { id:'worklist',  label:'Worklist',   icon:'≡' },
// //   { id:'ptp',       label:'PTP Tracker',icon:'✓' },
// //   { id:'log',       label:'Activity',   icon:'◷' },
// //   { id: 'logout',   label: 'Logout', icon: '⏻' }
// // ];

// const NAV = [
//   { id:'dashboard', label:'Dashboard',  icon:'▦' },
//   { id:'chat',      label:'Co-pilot',   icon:'◎' },

//   { id:'wtp',       label:'WTP',        icon:'⚡' },

//   { id:'email',     label:'Email Inbox', icon:'✉' },
//   { id:'disputes',  label:'Disputes',    icon:'⚖' },

//   { id:'worklist',  label:'Worklist',   icon:'≡' },
//   { id:'ptp',       label:'PTP Tracker',icon:'✓' },
//   { id:'log',       label:'Activity',   icon:'◷' },

//   { id:'logout',    label:'Logout', icon:'⏻' }
// ];

// export default function Sidebar({setChatQuery}) {
//   const navigate = useNavigate();
//   const location = useLocation();
//    const { setUser } = useAuth();

//   return (
//     <nav style={{
//       width:56,
//       background:'var(--bg-surface)',
//       borderRight:'1px solid var(--border)',
//       display:'flex',
//       flexDirection:'column',
//       alignItems:'center',
//       padding:'12px 0',
//       gap:4,
//       flexShrink:0
//     }}>

//       {/* Logo */}
//       <div style={{
//         width:32,
//         height:32,
//         borderRadius:'var(--radius-sm)',
//         marginBottom:12,
//         background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
//         display:'flex',
//         alignItems:'center',
//         justifyContent:'center',
//         fontSize:12,
//         fontWeight:800,
//         color:'#fff'
//       }}>
//         AR
//       </div>

//       {NAV.map(n => {
//         const isActive = location.pathname.includes(n.id);

//         return (
//           <button
//             key={n.id}
//             title={n.label}
//            onClick={() => {
//         if (n.id === "logout") {
//           setUser(null);
//           navigate("/");
//         } else {
//             if (n.id === "chat") {
//                   setChatQuery(null);
//                 }

//           navigate(`/app/${n.id}`);
//         }
//       }}
//             style={{
//               width:40,
//               height:40,
//               borderRadius:'var(--radius-sm)',
//               border:'none',
//               cursor:'pointer',
//               background: isActive ? 'rgba(79,142,247,0.15)' : 'transparent',
//               color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
//               fontSize:16,
//               transition:'all 0.15s',
//               display:'flex',
//               flexDirection:'column',
//               alignItems:'center',
//               justifyContent:'center',
//               gap:1
//             }}
//             onMouseEnter={e=>{
//               if(!isActive){
//                 e.currentTarget.style.background='var(--bg-hover)';
//                 e.currentTarget.style.color='var(--text-secondary)';
//               }
//             }}
//             onMouseLeave={e=>{
//               if(!isActive){
//                 e.currentTarget.style.background='transparent';
//                 e.currentTarget.style.color='var(--text-muted)';
//               }
//             }}
//           >
//             <span style={{fontSize:14}}>{n.icon}</span>
//           </button>
//         );
//       })}

//       <div style={{flex:1}}/>

//       {/* Refresh button */}
//       <button
//         title="Refresh"
//         style={{
//           width:40,
//           height:40,
//           borderRadius:'var(--radius-sm)',
//           border:'none',
//           cursor:'pointer',
//           background:'transparent',
//           color:'var(--text-muted)',
//           fontSize:14
//         }}
//         onMouseEnter={e=>{
//           e.currentTarget.style.background='var(--bg-hover)'
//         }}
//         onMouseLeave={e=>{
//           e.currentTarget.style.background='transparent'
//         }}
//       >
//         ↻
//       </button>
//     </nav>
//   );
// }

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const NAV = [
  { id:'dashboard', label:'Dashboard',  icon:'▦' },
  { id:'chat',      label:'Co-pilot',   icon:'◎' },

  { id:'wtp',       label:'WTP',        icon:'⚡' },
  { id:'email',     label:'Email Inbox',icon:'✉' },
  { id:'disputes',  label:'Disputes',   icon:'⚖' },

  { id:'worklist',  label:'Worklist',   icon:'≡' },
  { id:'ptp',       label:'PTP Tracker',icon:'✓' },
  { id:'log',       label:'Activity',   icon:'◷' },

  { id:'logout',    label:'Logout',     icon:'⏻' }
];

export default function Sidebar({ setChatQuery }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  return (
    <nav style={{
      width:56,
      background:'var(--bg-surface)',
      borderRight:'1px solid var(--border)',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      padding:'12px 0',
      gap:4,
      flexShrink:0
    }}>

      {/* Logo */}
      <div style={{
        width:32,
        height:32,
        borderRadius:'var(--radius-sm)',
        marginBottom:12,
        background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        fontSize:12,
        fontWeight:800,
        color:'#fff'
      }}>
        AR
      </div>

      {NAV.map(n => {
        const isActive = location.pathname.includes(`/app/${n.id}`);

        return (
          <button
            key={n.id}
            title={n.label}
            onClick={() => {
              if (n.id === "logout") {
                setUser(null);
                navigate("/");
                return;
              }

              // reset chat state when entering chat/wtp
              if (n.id === "chat" || n.id === "wtp") {
                setChatQuery(null);
              }

              navigate(`/app/${n.id}`);
            }}
            style={{
              width:40,
              height:40,
              borderRadius:'var(--radius-sm)',
              border:'none',
              cursor:'pointer',
              background: isActive ? 'rgba(79,142,247,0.15)' : 'transparent',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontSize:16,
              transition:'all 0.15s',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              justifyContent:'center'
            }}
            onMouseEnter={e=>{
              if(!isActive){
                e.currentTarget.style.background='var(--bg-hover)';
                e.currentTarget.style.color='var(--text-secondary)';
              }
            }}
            onMouseLeave={e=>{
              if(!isActive){
                e.currentTarget.style.background='transparent';
                e.currentTarget.style.color='var(--text-muted)';
              }
            }}
          >
            <span style={{fontSize:14}}>{n.icon}</span>
          </button>
        );
      })}

      <div style={{flex:1}}/>

      {/* Refresh */}
      <button
        title="Refresh"
        style={{
          width:40,
          height:40,
          borderRadius:'var(--radius-sm)',
          border:'none',
          cursor:'pointer',
          background:'transparent',
          color:'var(--text-muted)',
          fontSize:14
        }}
        onMouseEnter={e=>{
          e.currentTarget.style.background='var(--bg-hover)'
        }}
        onMouseLeave={e=>{
          e.currentTarget.style.background='transparent'
        }}
      >
        ↻
      </button>
    </nav>
  );
}
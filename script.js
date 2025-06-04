const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Configurações do Jogo ---
canvas.width = 640;
canvas.height = 640;

// Imagem do Pássaro
const birdImg = new Image();
birdImg.src = 'images/passaro.png';
let birdImageLoaded = false;

// Imagem dos Canos
const pipeImg = new Image();
pipeImg.src = 'images/canos.png';
let pipeImageLoaded = false;

// Dimensões Visuais do Pássaro
const birdWidth = 130;  // Largura VISUAL do pássaro em pixels
const birdHeight = 90; // Altura VISUAL do pássaro em pixels

// Ajustes para a Hitbox do Pássaro
const hitboxPaddingHorizontal = 15; // Reduz X pixels de cada lado (esquerdo/direito)
const hitboxPaddingVertical = 15;   // Reduz Y pixels de cada lado (cima/baixo)

// Lógica para iniciar o jogo após carregar TODAS as imagens
let assetsToLoad = 2; // Pássaro e Cano
let assetsLoaded = 0;
let gameLoopRequestId; // Para controlar o requestAnimationFrame

function onAssetLoad() {
    assetsLoaded++;
    if (assetsLoaded === assetsToLoad) {
        console.log("Todas as imagens carregadas!");
        // A primeira chamada ao gameLoop já terá sido feita (no final do script)
        // para mostrar a tela inicial.
        // O resetGame garante que o estado está correto para o início efetivo.
        // O if !gameLoopRequestId é uma segurança extra, mas o gameLoop já deve estar rodando.
        if (!gameStarted) { // Se o jogo ainda não começou pela interação do usuário
            resetGame(); // Garante que o estado está pronto
        }
    }
}

birdImg.onload = function() {
    birdImageLoaded = true;
    console.log("Imagem do pássaro carregada!");
    onAssetLoad();
};
birdImg.onerror = function() {
    console.error("Erro ao carregar a imagem do pássaro. Verifique o caminho: 'images/passaro.png'");
    birdImageLoaded = true; // Permite que o jogo prossiga com o fallback (quadrado amarelo)
    onAssetLoad(); // Considera como "carregado" para não travar o jogo
};

pipeImg.onload = function() {
    pipeImageLoaded = true;
    console.log("Imagem dos canos carregada!");
    onAssetLoad();
};
pipeImg.onerror = function() {
    console.error("Erro ao carregar a imagem dos canos. Verifique o caminho: 'images/canos.png'");
    pipeImageLoaded = true; // Permite que o jogo prossiga com o fallback (retângulos verdes)
    onAssetLoad(); // Considera como "carregado" para não travar o jogo
};

// Variáveis do Pássaro
let birdX = 50;
let birdY = canvas.height / 2 - birdHeight / 2;
let birdVelocityY = 0;
const gravity = 0.2;
const jumpStrength = -7;

// Variáveis dos Canos
let pipes = [];
const pipeWidth = 75; // Largura de colisão e desenho para os canos
const pipeGap = 250;
let pipeSpawnTimer = 0;
const pipeSpawnInterval = 150; // Frames até novo cano (150 frames / 60 FPS = 2.5 segundos)
const pipeSpeed = 2;

// Estado do Jogo e Pontuação
let score = 0;
let gameRunning = false;
let gameStarted = false;

// --- Funções de Desenho ---
function drawBird() {
    if (birdImageLoaded && birdImg.complete && birdImg.naturalWidth !== 0) {
        ctx.drawImage(birdImg, birdX, birdY, birdWidth, birdHeight);
    } else {
        ctx.fillStyle = 'yellow'; // Fallback
        ctx.fillRect(birdX, birdY, birdWidth, birdHeight);
    }
}

function drawPipes() {
    if (!pipeImageLoaded || !pipeImg.complete || pipeImg.naturalWidth === 0) {
        // Fallback: Desenha retângulos se a imagem do cano não carregou
        ctx.fillStyle = '#2E7D32';
        pipes.forEach(pipe => {
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        });
        return;
    }

    pipes.forEach(pipe => {
        // Cano Inferior
        ctx.drawImage(
            pipeImg, // imagem
            0, 0, pipeImg.width, pipeImg.height, // origem (imagem inteira)
            pipe.x, pipe.bottomY,                 // destino X, Y
            pipeWidth, canvas.height - pipe.bottomY // destino Largura, Altura
        );

        // Cano Superior (rotacionado)
        ctx.save();
        ctx.translate(pipe.x + pipeWidth / 2, pipe.topHeight);
        ctx.rotate(Math.PI); // Rotaciona 180 graus
        ctx.drawImage(
            pipeImg, // imagem
            0, 0, pipeImg.width, pipeImg.height, // origem (imagem inteira)
            -pipeWidth / 2, 0,                   // destino X, Y (relativo ao ponto transladado/rotacionado)
            pipeWidth, pipe.topHeight            // destino Largura, Altura
        );
        ctx.restore();
    });
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = '30px "Press Start 2P", Arial, sans-serif';
    const text = `Score: ${score}`;
    const textWidth = ctx.measureText(text).width;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, 50);
    ctx.fillText(text, (canvas.width - textWidth) / 2, 50);
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Clique ou Espaço', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText('para Começar', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px Arial';
    ctx.fillText('Clique ou Espaço', canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText('para Recomeçar', canvas.width / 2, canvas.height / 2 + 60);
    ctx.textAlign = 'left';
}

// --- Funções de Lógica do Jogo ---
function updateBird() {
    if (!gameRunning) return;
    birdVelocityY += gravity;
    birdY += birdVelocityY;

    if (birdY < 0) { // Impede sair pelo topo (sem game over por teto)
        birdY = 0;
        birdVelocityY = 0;
    }
}

function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const topPipeHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const bottomPipeY = topPipeHeight + pipeGap;

    pipes.push({
        x: canvas.width,
        topHeight: topPipeHeight,
        bottomY: bottomPipeY,
        scored: false
    });
}

function updatePipes() {
    if (!gameRunning) return;
    pipeSpawnTimer++;
    if (pipeSpawnTimer >= pipeSpawnInterval) {
        spawnPipe();
        pipeSpawnTimer = 0;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        if (!pipes[i].scored && pipes[i].x + pipeWidth < birdX + hitboxPaddingHorizontal) { // Ponto ao passar a hitbox
            score++;
            pipes[i].scored = true;
        }
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }
}

function checkCollisions() {
    const currentHitboxWidth = birdWidth - 2 * hitboxPaddingHorizontal;
    const currentHitboxHeight = birdHeight - 2 * hitboxPaddingVertical;
    const hitboxX = birdX + hitboxPaddingHorizontal;
    const hitboxY = birdY + hitboxPaddingVertical;

    // Colisão com o chão
    if (hitboxY + currentHitboxHeight > canvas.height) {
        return true;
    }
    // Colisão com o teto (se birdY < 0 não for tratado em updateBird como parada)
    // if (hitboxY < 0) { return true; } // Atualmente updateBird previne isso.

    // Colisão com canos
    for (let pipe of pipes) {
        if (hitboxX < pipe.x + pipeWidth &&
            hitboxX + currentHitboxWidth > pipe.x &&
            (hitboxY < pipe.topHeight || hitboxY + currentHitboxHeight > pipe.bottomY)
           ) {
            return true;
        }
    }
    return false;
}

function resetGame() {
    birdX = 50;
    birdY = canvas.height / 2 - birdHeight / 2;
    birdVelocityY = 0;
    pipes = [];
    score = 0;
    pipeSpawnTimer = pipeSpawnInterval;
    gameRunning = false;
    // gameStarted é resetado aqui, ou apenas no primeiro carregamento da página?
    // Para permitir que a tela de "Game Over" apareça antes do "Clique para começar"
    // gameStarted não deve ser resetado para false aqui, a menos que seja a primeira carga.
    // A lógica atual em handleInput e gameLoop parece lidar bem com isso.
    // Se gameStarted for true e gameRunning for false, é game over.
    // Se gameStarted for false, é a tela inicial.
}

// --- Controles e Loop Principal ---
function handleInput() {
    if (!gameStarted) {
        gameRunning = true;
        gameStarted = true; // Marca que o jogo já foi iniciado uma vez
        birdVelocityY = jumpStrength;
    } else if (!gameRunning && gameStarted) { // Recomeçar após Game Over
        resetGame(); // Reseta posições, score, canos
        gameRunning = true; // Inicia a lógica de jogo novamente
        birdVelocityY = jumpStrength; // Pulinho inicial ao recomeçar
    } else if (gameRunning) {
        birdVelocityY = jumpStrength;
    }
}

canvas.addEventListener('click', handleInput);
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        handleInput();
    }
});
canvas.addEventListener('touchstart', function(event) {
    event.preventDefault();
    handleInput();
});

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        drawStartScreen();
    } else if (!gameRunning && gameStarted) { // Game Over
        drawPipes();
        drawBird();
        drawScore();
        drawGameOverScreen();

        // --- DEBUG: Desenha a Hitbox no Game Over ---
        // (Comente ou remova esta seção quando não precisar mais)
        /*
        const debugHitboxWidth = birdWidth - 2 * hitboxPaddingHorizontal;
        const debugHitboxHeight = birdHeight - 2 * hitboxPaddingVertical;
        const debugHitboxX = birdX + hitboxPaddingHorizontal;
        const debugHitboxY = birdY + hitboxPaddingVertical;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(debugHitboxX, debugHitboxY, debugHitboxWidth, debugHitboxHeight);
        */
        // --- FIM DEBUG ---

    } else if (gameRunning) { // Jogo Rodando
        updateBird();
        updatePipes();

        drawPipes();
        drawBird();
        drawScore();

        // --- DEBUG: Desenha a Hitbox Durante o Jogo ---
        // (Comente ou remova esta seção quando não precisar mais)
        /*
        const debugHitboxWidth = birdWidth - 2 * hitboxPaddingHorizontal;
        const debugHitboxHeight = birdHeight - 2 * hitboxPaddingVertical;
        const debugHitboxX = birdX + hitboxPaddingHorizontal;
        const debugHitboxY = birdY + hitboxPaddingVertical;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(debugHitboxX, debugHitboxY, debugHitboxWidth, debugHitboxHeight);
        */
        // --- FIM DEBUG ---

        if (checkCollisions()) {
            gameRunning = false;
        }
    }
    gameLoopRequestId = requestAnimationFrame(gameLoop);
}

// --- Inicialização ---
// Chama resetGame para definir o estado inicial das variáveis.
// Chama gameLoop uma vez para iniciar o ciclo e mostrar a tela inicial.
// A função onAssetLoad cuidará de chamar resetGame novamente (se necessário)
// e garantir que o jogo esteja pronto quando as imagens carregarem.
resetGame();
// A primeira chamada de gameLoop inicia o processo.
// Se gameLoopRequestId já existir (improvável aqui), não chama de novo.
if (typeof gameLoopRequestId === 'undefined') {
    gameLoop();
}
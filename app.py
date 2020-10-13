import os
import datetime
import sqlite3



from flask import Flask, flash, jsonify, redirect, render_template, request, session
from flask_session import Session
from tempfile import mkdtemp
from werkzeug.exceptions import default_exceptions, HTTPException, InternalServerError
from werkzeug.security import check_password_hash, generate_password_hash

from helpers import apology, login_required, lookup, usd

# Configure application
app = Flask(__name__)

# Ensure templates are auto-reloaded
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response
# Custom filter
# app.jinja_env.filters["usd"] = usd

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Set up connection to db, instead of using CS50 library
conn = sqlite3.connect('route50.db', check_same_thread=False)
conn.row_factory = sqlite3.Row
db = conn.cursor()

# Make sure API key is set
if not os.environ.get("API_KEY"):
    raise RuntimeError("API_KEY not set")

def clever_function(row, symbol, price, no_shares):
    return usd(lookup(row[symbol])[price] * no_shares)

# defining jinja function to apply usd filter
def usd_function(row, price):
    return usd(abs(row[price]))

app.jinja_env.globals.update(clever_function=clever_function)
app.jinja_env.globals.update(usd_function=usd_function)

@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    """Show portfolio of stocks"""
    return render_template("index.html")

@app.route("/buy", methods=["GET", "POST"])
@login_required
def buy():
    """Buy shares of stock"""
    if request.method == "POST":
        symbol = request.form.get("symbol")
        lookupValues = lookup(symbol)
        if not request.form.get("symbol") and not lookupValues:
            return apology("symbol not existing", 403)
        shares = int(request.form.get("share"))
        if not int(shares) > 0:
            return apology("shares have to be a positive number", 403)
        price = lookupValues["price"]
        companyN = lookupValues["name"]
        user_id = session["user_id"]
        db.execute("SELECT * FROM users WHERE id = (?)",(user_id,))
        user = db.fetchall()
        cash = user[0]["cash"]
        name = user[0]["username"]
        cost = price * shares
        if cost > cash:
            flash('Not enough cash to buy the selected amount')
            return redirect("/buy")
        db.execute("UPDATE users SET cash=? WHERE id=?", (cash-cost, user_id,))
        db.execute("INSERT INTO purchases(price, username, symbol, shares, date, TOTAL, companyN) VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, ?,?)", (price, name, symbol, shares, cost, companyN,))
        conn.commit()
        return redirect('/')
    else:
        return render_template("buy.html")


@app.route("/history")
@login_required
def history():
    """Show history of transactions"""
    username = session["username"]
    rows = db.execute("SELECT price, date, symbol, shares FROM purchases WHERE username=?", (username,))
    print(rows)
    return render_template("history.html", rows=rows)



@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # Connect to the user db
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "route50.db")
    with sqlite3.connect("route50.db") as conn:
        conn.row_factory = sqlite3.Row
        db = conn.cursor()
        

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":

        # Ensure username was submitted
        if not request.form.get("username"):
            return apology("must provide username", 403)

        # Ensure password was submitted
        elif not request.form.get("password"):
            return apology("must provide password", 403)

        # Query database for username
        db.execute("SELECT * FROM users WHERE username = (?)",(request.form.get("username"),))
        rows=db.fetchall()
        

        # Ensure username exists and password is correct
        if len(rows)!= 1 or not check_password_hash(rows[0]["hash"], request.form.get("password")):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]

        # Remember username of logged user
        session["username"] = rows[0]["username"]

        # Redirect user to home page
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.route("/quote", methods=["GET", "POST"])
@login_required
def quote():
    """Get stock quote."""
    if request.method == "GET":
        return render_template("quote.html")
    elif request.method =="POST":
        symbol = request.form.get("symbol")
        lookupValues = lookup(symbol)
        if not lookupValues:
            #return apology("invalid symbol", 400)#
            flash("Invalid symbol")
            return redirect("/quote")
        else:
            name = lookupValues["name"]
            price = lookupValues["price"]
            symbol = lookupValues["symbol"]
            return render_template("quoted.html", name=name, price=price, symbol=symbol)


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""
       # Connect to the user db
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "route50.db")
    with sqlite3.connect("route50.db") as conn:
        conn.row_factory = sqlite3.Row
        db = conn.cursor()
    if request.method == "POST":
        if not request.form.get("username"):
            return apology("must provide username", 403)
        if not request.form.get("password"):
            return apology("must provide password", 403)
        if not request.form.get("confirmation"):
            return apology("must provide confirmation", 403)
        if not request.form.get("password")==request.form.get("confirmation"):
            return apology("passwords don't match", 403)
        username = request.form.get("username")
        password = request.form.get("password")
        hashcode = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
        db.execute("SELECT * FROM users WHERE username = ?", (username,))
        rows=db.fetchall()
        if len(rows) == 1:
            flash('Looks like the username already exists!')
            return redirect("/register")

        db.execute("INSERT INTO users(username, hash) VALUES(?, ?)", (username, hashcode,))
        conn.commit()
        return redirect("/login")
    else:
        return render_template("register.html")


@app.route("/sell", methods=["GET", "POST"])
@login_required
def sell():
    """Sell shares of stock"""
    if request.method == "GET":
        user = session["username"]
        db.execute("SELECT DISTINCT symbol FROM purchases WHERE username = ?", (user,))
        rows=db.fetchall()
        return render_template("sell.html", rows=rows)
    else:
        symbol = request.form.get("symbol")
        shares = -int(request.form.get("shares"))
        username = session["username"]
        db.execute("SELECT SUM(shares) FROM purchases WHERE username=? AND symbol=? GROUP BY symbol", (username, symbol,))
        rows = db.fetchall()
        current_shares = int(rows[0]["SUM(shares)"])
        if current_shares+shares < 0:
            flash('You do not have enough shares to finish the transaction')
            return redirect("/sell")
        else:
            lookupValues = lookup(symbol)
            price = -float(lookupValues["price"])
            companyN = lookupValues["name"]
            db.execute("SELECT * FROM users WHERE username=:username", username=username)
            user = db.fetchall()
            cash = user[0]["cash"]
            # turning cost to a positive value that will add up to the cash
            cost = price * shares
            db.execute("UPDATE users SET cash=:cash WHERE username=:user", cash= cash+cost, user=username)
            db.execute("INSERT INTO purchases(price, username, symbol, shares, date, TOTAL, companyN) VALUES(:price, :username, :symbol, :shares, CURRENT_TIMESTAMP, :TOTAL, :companyN)", price=price, username=username,symbol=symbol, shares=shares, TOTAL=cost, companyN=companyN)
            conn.commit()
            return redirect("/")

@app.route("/account", methods=["GET", "POST"])
@login_required
def account():
    "Change account's credentials"
    if request.method == "POST":
        username=session["username"]
        #extracting current password hash from db
        currentPassword = db.execute("SELECT hash FROM users WHERE username=:username", username=username)
        print(currentPassword[0]["hash"])
        #prompting the user for current password and transforming it into hashcode
        old_password = request.form.get("old_password")
        # Checks whether there is some input into old password field; if not, user may instead want to add cash
        if old_password:
            old_hashcode = generate_password_hash(old_password, method='pbkdf2:sha256', salt_length=8)
            print(old_hashcode)
            new_password = request.form.get("new_password")
            rt_new_password = request.form.get("retype_new_password")
            new_hashcode = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=8)
            if check_password_hash(currentPassword[0]["hash"], old_password):
                if new_password == rt_new_password:
                    db.execute("UPDATE users SET hash=:hashcode WHERE username=:username", hashcode=new_hashcode, username=username)
                    flash('Password changed successfully!')
                    return redirect("/")
                else:
                    flash('Passwords do not match!')
                    return redirect("/account")
            else:
                flash('Incorrect old password!')
                return redirect("/account")
        added_cash = float(request.form.get("cash_addition"))
        if added_cash:
            db.execute("UPDATE users SET cash=cash+ :added_cash", added_cash=added_cash)
            flash('Added cash into your account!')
            return redirect("/account")
    else:
        return render_template("account.html")


def errorhandler(e):
    """Handle error"""
    if not isinstance(e, HTTPException):
        e = InternalServerError()
    return apology(e.name, e.code)


# Listen for errors
for code in default_exceptions:
    app.errorhandler(code)(errorhandler)
